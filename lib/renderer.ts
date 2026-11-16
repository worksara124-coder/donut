/**
 * Canvas renderer + transition engine ("CinematicTransition").
 *
 * Each frame is drawn "cover" on wide screens. When a scene needs more of the
 * 16:9 frame than a tall/narrow screen can show (see SceneDef.portraitVisible),
 * the frame is drawn as a band, its top and bottom edges are feathered, and the
 * rest of the screen is filled with colours sampled from the edges of the
 * frame — so the product is never cropped out and there are no hard bars.
 */
import { SCENES, easeInOut, smooth, visibleAt, type Resolved } from "./timeline";

type Source = ImageBitmap | HTMLImageElement;
export const BASE_YELLOW = "#fbeb93";

interface Xf {
  alpha: number;
  scale: number;
  /** vertical travel, as a fraction of the drawn frame height */
  ty: number;
  /** extra vertical shift in canvas px (used by the outro) */
  shift: number;
}

const TINY_W = 16;
const TINY_H = 9;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private band: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private tiny: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.band = document.createElement("canvas");
    this.bctx = this.band.getContext("2d")!;
    this.tiny = document.createElement("canvas");
    this.tiny.width = TINY_W;
    this.tiny.height = TINY_H;
    this.tctx = this.tiny.getContext("2d", { willReadFrequently: true })!;
  }

  resize(w: number, h: number) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /** Top of the bag frame on screen in canvas px (lets the outro know how much room there is). */
  private layout(src: Source, scene: number, frame: number) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const iw = src.width;
    const ih = src.height;
    const cover = Math.max(cw / iw, ch / ih);
    const fCover = cw / (iw * cover); // fraction of the frame width visible in "cover"
    const f = Math.min(1, Math.max(fCover, visibleAt(scene, frame)));
    const scale = cw / (f * iw);
    const dw = iw * scale;
    const dh = ih * scale;
    const banded = dh < ch - 1;
    // on tall screens the band sits a touch below centre, leaving air for the captions
    let cy = banded && dh < ch * 0.7 ? ch * 0.54 : ch * 0.5;
    // e.g. the bag keeps standing on the bottom edge of the screen, as it does in the film
    if (banded && SCENES[scene].anchor === "bottom") cy = ch - dh / 2;
    return { cw, ch, dw, dh, banded, cy, top: cy - dh / 2 };
  }

  private drawLayer(src: Source, scene: number, frame: number, xf: Xf) {
    if (xf.alpha <= 0.001) return;
    const { ctx } = this;
    const L = this.layout(src, scene, frame);
    const { cw, ch, dw, dh, cy } = L;
    const dx = (cw - dw) / 2;
    const feathered = L.banded || xf.shift > 0.5;

    ctx.globalAlpha = Math.min(1, xf.alpha);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (!feathered) {
      ctx.setTransform(xf.scale, 0, 0, xf.scale, cw / 2 - (cw / 2) * xf.scale, cy - cy * xf.scale + xf.ty * dh);
      ctx.drawImage(src, dx, cy - dh / 2, dw, dh);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }

    // --- backdrop: flat colours sampled from the top and bottom rows of the visible frame area,
    // so the feathered band melts into a matching field instead of ending on a hard bar
    const visW = Math.min(1, cw / dw) * src.width;
    const sx = (src.width - visW) / 2;
    this.tctx.drawImage(src, sx, 0, visW, src.height, 0, 0, TINY_W, TINY_H);
    const px = this.tctx.getImageData(0, 0, TINY_W, TINY_H).data;
    // dominant colour of the frame = its background; for each edge row keep the pixel closest
    // to it, so subjects crossing the edge (hands, donuts) never tint the fill
    const buckets = new Map<number, number>();
    let domKey = 0;
    let domCount = 0;
    for (let i = 0; i < px.length; i += 4) {
      const k = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
      const c = (buckets.get(k) ?? 0) + 1;
      buckets.set(k, c);
      if (c > domCount) {
        domCount = c;
        domKey = k;
      }
    }
    const dr = ((domKey >> 8) & 15) * 16 + 8;
    const dg = ((domKey >> 4) & 15) * 16 + 8;
    const db = (domKey & 15) * 16 + 8;
    const rowColor = (row: number) => {
      let best = 0;
      let bestD = Infinity;
      for (let x = 0; x < TINY_W; x++) {
        const o = (row * TINY_W + x) * 4;
        const d = Math.abs(px[o] - dr) + Math.abs(px[o + 1] - dg) + Math.abs(px[o + 2] - db);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      return `rgb(${px[best]},${px[best + 1]},${px[best + 2]})`;
    };
    const top = L.top + xf.shift;
    const bottom = top + dh;
    const grad = ctx.createLinearGradient(0, top, 0, bottom);
    grad.addColorStop(0, rowColor(0));
    grad.addColorStop(1, rowColor(TINY_H - 1));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // --- band: the sharp frame with feathered top/bottom edges
    const bw = Math.ceil(cw);
    const bh = Math.ceil(dh);
    if (this.band.width !== bw || this.band.height !== bh) {
      this.band.width = bw;
      this.band.height = bh;
    }
    const b = this.bctx;
    b.globalCompositeOperation = "source-over";
    b.clearRect(0, 0, bw, bh);
    b.imageSmoothingEnabled = true;
    b.imageSmoothingQuality = "high";
    b.drawImage(src, dx, 0, dw, dh);
    b.globalCompositeOperation = "destination-out";
    const feather = Math.min(dh * 0.14, ch * 0.09);
    if (top > -1) {
      const g = b.createLinearGradient(0, 0, 0, feather);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      b.fillStyle = g;
      b.fillRect(0, 0, bw, feather);
    }
    if (bottom < ch + 1) {
      const g = b.createLinearGradient(0, bh - feather, 0, bh);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,1)");
      b.fillStyle = g;
      b.fillRect(0, bh - feather, bw, feather);
    }

    const mid = top + dh / 2;
    ctx.setTransform(xf.scale, 0, 0, xf.scale, cw / 2 - (cw / 2) * xf.scale, mid - mid * xf.scale + xf.ty * dh);
    ctx.drawImage(this.band, 0, top);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Draws the current moment. `getA`/`getB` are the bitmaps for the two layers.
   * Returns false when nothing could be drawn yet (frames still loading).
   */
  draw(r: Resolved, a: Source | null, b: Source | null): boolean {
    const { ctx, canvas } = this;
    if (!a && !b) return false;
    ctx.globalAlpha = 1;
    ctx.fillStyle = BASE_YELLOW;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const id: Xf = { alpha: 1, scale: 1, ty: 0, shift: 0 };

    if (!r.b || !r.transition) {
      if (!a) return false;
      let shift = 0;
      if (r.outro > 0) {
        // final hold: the bag settles lower so the logo, slogan and CTA get clear space above it
        const L = this.layout(a, r.a.scene, r.a.frame);
        shift = easeInOut(Math.min(1, r.outro / 0.55)) * Math.max(0, canvas.height * 0.1 - Math.max(0, L.top));
      }
      this.drawLayer(a, r.a.scene, r.a.frame, { ...id, shift });
      ctx.globalAlpha = 1;
      return true;
    }

    const e = easeInOut(r.t);
    // B is fully opaque at 75% of the window; A then finishes fading behind it
    const alphaA = 1 - smooth((r.t - 0.5) / 0.5);
    const alphaB = smooth(r.t / 0.75);
    const tr = r.transition;
    const xa: Xf = { ...id, alpha: alphaA, scale: 1 + (tr.aScale - 1) * e, ty: tr.aTy * e };
    const xb: Xf = { ...id, alpha: alphaB, scale: tr.bScale + (1 - tr.bScale) * e };

    if (a) this.drawLayer(a, r.a.scene, r.a.frame, xa);
    if (b) this.drawLayer(b, r.b.scene, r.b.frame, xb);
    ctx.globalAlpha = 1;
    return true;
  }
}
