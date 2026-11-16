/**
 * FrameStore — loads the image sequences and keeps memory bounded.
 *
 * - Frames are downloaded as compressed Blobs (cheap to keep around).
 * - Only a small sliding window around the playhead is decoded to bitmaps;
 *   everything else is released (ImageBitmap.close()).
 * - Scenes download coarse-to-fine (every 16th frame, then 8th, 4th…), so a
 *   scene is scrubbable almost immediately and sharpens temporally as it loads.
 * - Only the active scene and the next one are requested: later scenes wait
 *   until the user gets close.
 */
import { SCENES } from "./timeline";
import { FRAMES_VERSION } from "./framesVersion";

type Bitmap = ImageBitmap | HTMLImageElement;

interface SceneState {
  blobs: (Blob | null)[];
  failed: Uint8Array;
  order: number[]; // download order
  cursor: number; // next index in `order`
  loaded: number;
  requested: boolean;
}

const key = (scene: number, frame: number) => scene * 10000 + frame;

function coarseToFine(n: number): number[] {
  const seen = new Uint8Array(n);
  const out: number[] = [];
  const push = (i: number) => {
    if (i < n && !seen[i]) {
      seen[i] = 1;
      out.push(i);
    }
  };
  push(0);
  push(n - 1);
  for (let step = 16; step >= 1; step /= 2) for (let i = 0; i < n; i += step) push(i);
  return out;
}

export interface FrameStoreOptions {
  variant: "d" | "m";
  maxBitmaps: number;
  concurrency: number;
  onDirty: () => void;
}

export class FrameStore {
  private scenes: SceneState[];
  private bitmaps = new Map<number, Bitmap>();
  private decoding = new Set<number>();
  private inflight = 0;
  private priority: number[] = [0];
  private disposed = false;
  private playheads: { scene: number; frame: number }[] = [];
  private canBitmap = typeof createImageBitmap === "function";

  constructor(private opts: FrameStoreOptions) {
    this.scenes = SCENES.map((s) => ({
      blobs: new Array(s.frames).fill(null),
      failed: new Uint8Array(s.frames),
      order: coarseToFine(s.frames),
      cursor: 0,
      loaded: 0,
      requested: false,
    }));
  }

  private url(scene: number, frame: number) {
    return `/frames/${SCENES[scene].id}/${this.opts.variant}/${String(frame + 1).padStart(4, "0")}.webp?v=${FRAMES_VERSION}`;
  }

  /** Fraction (0–1) of a scene's frames already downloaded. */
  loadedRatio(scene: number) {
    return this.scenes[scene].loaded / SCENES[scene].frames;
  }

  /** Ask for scenes, most important first. Idempotent. */
  request(scenes: number[]) {
    this.priority = scenes.filter((i) => i >= 0 && i < SCENES.length);
    this.priority.forEach((i) => (this.scenes[i].requested = true));
    this.pump();
  }

  private nextJob(): { scene: number; frame: number } | null {
    for (const i of this.priority) {
      const s = this.scenes[i];
      if (s.cursor < s.order.length) return { scene: i, frame: s.order[s.cursor++] };
    }
    return null;
  }

  private pump() {
    while (!this.disposed && this.inflight < this.opts.concurrency) {
      const job = this.nextJob();
      if (!job) return;
      this.inflight++;
      this.fetchFrame(job.scene, job.frame, 1).finally(() => {
        this.inflight--;
        this.pump();
      });
    }
  }

  private async fetchFrame(scene: number, frame: number, retries: number): Promise<void> {
    try {
      const res = await fetch(this.url(scene, frame));
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (this.disposed) return;
      const s = this.scenes[scene];
      s.blobs[frame] = blob;
      s.loaded++;
      this.opts.onDirty();
    } catch {
      if (retries > 0 && !this.disposed) return this.fetchFrame(scene, frame, retries - 1);
      // Give up on this frame: the renderer falls back to its nearest neighbour.
      this.scenes[scene].failed[frame] = 1;
    }
  }

  private async decode(scene: number, frame: number) {
    const k = key(scene, frame);
    const blob = this.scenes[scene].blobs[frame];
    if (!blob || this.bitmaps.has(k) || this.decoding.has(k)) return;
    this.decoding.add(k);
    try {
      let bmp: Bitmap;
      if (this.canBitmap) {
        bmp = await createImageBitmap(blob);
      } else {
        const img = new Image();
        const src = URL.createObjectURL(blob);
        img.src = src;
        await img.decode();
        URL.revokeObjectURL(src);
        bmp = img;
      }
      if (this.disposed) {
        (bmp as ImageBitmap).close?.();
        return;
      }
      this.bitmaps.set(k, bmp);
      this.evict();
      this.opts.onDirty();
    } catch {
      this.scenes[scene].failed[frame] = 1;
    } finally {
      this.decoding.delete(k);
    }
  }

  private evict() {
    if (this.bitmaps.size <= this.opts.maxBitmaps) return;
    const dist = (k: number) => {
      const scene = Math.floor(k / 10000);
      const frame = k % 10000;
      let d = Infinity;
      for (const p of this.playheads) if (p.scene === scene) d = Math.min(d, Math.abs(p.frame - frame));
      return d;
    };
    const entries = [...this.bitmaps.keys()].sort((x, y) => dist(y) - dist(x));
    for (const k of entries) {
      if (this.bitmaps.size <= this.opts.maxBitmaps * 0.8) break;
      (this.bitmaps.get(k) as ImageBitmap).close?.();
      this.bitmaps.delete(k);
    }
  }

  /** Tell the store where the playheads are (used for eviction). */
  setPlayheads(heads: { scene: number; frame: number }[]) {
    this.playheads = heads;
  }

  /**
   * Returns the best bitmap available for (scene, frame) and schedules the
   * decoding of the frames around it, favouring the direction of travel.
   */
  get(scene: number, frame: number, direction: 1 | -1): Bitmap | null {
    const n = SCENES[scene].frames;
    const target = Math.min(n - 1, Math.max(0, Math.round(frame)));
    const s = this.scenes[scene];

    // 1. schedule decodes: target first, then ahead, a little behind
    let budget = 4 - this.decoding.size;
    if (budget > 0) {
      const ahead = 14;
      const behind = 4;
      const tryDecode = (f: number) => {
        if (budget <= 0 || f < 0 || f >= n) return;
        const k = key(scene, f);
        if (s.blobs[f] && !this.bitmaps.has(k) && !this.decoding.has(k)) {
          budget--;
          void this.decode(scene, f);
        }
      };
      tryDecode(target);
      for (let o = 1; o <= ahead && budget > 0; o++) {
        tryDecode(target + o * direction);
        if (o <= behind) tryDecode(target - o * direction);
      }
      // nothing decodable near the target yet (still downloading): decode the nearest blob we have
      if (budget > 0 && !this.bitmaps.has(key(scene, target)) && !s.blobs[target]) {
        for (let o = 1; o < n; o++) {
          const lo = target - o;
          const hi = target + o;
          if (lo >= 0 && s.blobs[lo]) {
            tryDecode(lo);
            break;
          }
          if (hi < n && s.blobs[hi]) {
            tryDecode(hi);
            break;
          }
        }
      }
    }

    // 2. return the nearest decoded frame
    const exact = this.bitmaps.get(key(scene, target));
    if (exact) return exact;
    for (let o = 1; o < n; o++) {
      const lo = target - o;
      const hi = target + o;
      if (lo < 0 && hi >= n) break;
      const a = lo >= 0 ? this.bitmaps.get(key(scene, lo)) : undefined;
      if (a) return a;
      const b = hi < n ? this.bitmaps.get(key(scene, hi)) : undefined;
      if (b) return b;
    }
    return null;
  }

  dispose() {
    this.disposed = true;
    this.bitmaps.forEach((b) => (b as ImageBitmap).close?.());
    this.bitmaps.clear();
    this.scenes.forEach((s) => s.blobs.fill(null));
  }
}
