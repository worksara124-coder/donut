/**
 * The cinematic timeline.
 *
 * Everything is expressed in "scroll units" (1 unit = 1vh of scrolling), then
 * normalised to a 0 → 1 progress. Scenes play their frames; between two scenes a
 * transition window holds the last frame of A and the first frame of B and
 * blends them. All of it is a pure function of progress, so it is reversible.
 */

export type SceneId = "mood" | "zoom" | "duo" | "bag";
export interface TransitionDef {
  /** scroll distance in vh */
  scroll: number;
  /** outgoing shot: final scale and vertical travel (fraction of frame height) while it fades */
  aScale: number;
  aTy: number;
  /** incoming shot: starting scale (settles to 1) */
  bScale: number;
}
export type NavTone = "pink" | "choc" | "cream";

export interface SceneDef {
  id: SceneId;
  /** number of frames in /public/frames/<id>/{d|m}/ */
  frames: number;
  /** scroll distance in vh */
  scroll: number;
  /**
   * Portrait framing: fraction of the 16:9 frame width that must stay visible
   * on a tall screen (1 = whole frame, lower = tighter crop, 0 = plain "cover").
   * Either a constant or [frame, value] keyframes, so framing can follow the shot.
   */
  portraitVisible: number | [number, number][];
  /** where the frame band sits on tall screens */
  anchor?: "center" | "bottom";
  tone: NavTone;
}

export const SCENES: SceneDef[] = [
  // Scenes 1 + 2 (1080p) — hands pick the donuts out of MOOD, the letters part and the
  // white donut flies in. The source already contains its own morph between the two.
  // On phones: whole word visible first, then the framing tightens on the donut.
  {
    id: "mood",
    frames: 190,
    scroll: 420,
    portraitVisible: [
      [0, 1],
      [100, 1],
      [128, 0.56],
    ],
    tone: "pink",
  },
  // Scene 3 (720p) — the donut dives into the lens, down to the frosting
  {
    id: "zoom",
    frames: 128,
    scroll: 200,
    portraitVisible: [
      [0, 0.86],
      [58, 0],
    ],
    tone: "pink",
  },
  // Scene 4 (720p) — chocolate + vanilla, splashes, camera pulls back
  { id: "duo", frames: 192, scroll: 250, portraitVisible: 0.7, tone: "choc" },
  // Scene 5 (1080p) — both donuts drop into the MOOD bag
  { id: "bag", frames: 190, scroll: 230, portraitVisible: 0.52, tone: "choc" },
];

export function visibleAt(scene: number, frame: number): number {
  const v = SCENES[scene].portraitVisible;
  if (typeof v === "number") return v;
  if (frame <= v[0][0]) return v[0][1];
  for (let i = 1; i < v.length; i++) {
    if (frame <= v[i][0]) {
      const k = (frame - v[i - 1][0]) / (v[i][0] - v[i - 1][0]);
      const e = k * k * (3 - 2 * k);
      return v[i - 1][1] + (v[i][1] - v[i - 1][1]) * e;
    }
  }
  return v[v.length - 1][1];
}

/** Transition i sits between scene i and scene i + 1. */
export const TRANSITIONS: TransitionDef[] = [
  // floating donut → same donut, same tilt, ~1.8× closer: A pushes in until the sizes meet
  { scroll: 50, aScale: 1.8, aTy: 0.02, bScale: 1 },
  // extreme frosting close-up → splash shot: push through A while B settles back
  { scroll: 60, aScale: 1.32, aTy: 0, bScale: 1.14 },
  // the duo lifts out of frame; in the next shot the donuts fall back in from the top
  { scroll: 60, aScale: 1, aTy: -0.8, bScale: 1 },
];

/** Scroll distance after the last frame where the final brand reveal rests. */
export const OUTRO_SCROLL = 90;

export interface Segment {
  kind: "scene" | "transition" | "outro";
  index: number;
  start: number; // normalised
  end: number; // normalised
}

function build() {
  const segs: Segment[] = [];
  let cursor = 0;
  SCENES.forEach((s, i) => {
    segs.push({ kind: "scene", index: i, start: cursor, end: cursor + s.scroll });
    cursor += s.scroll;
    if (i < TRANSITIONS.length) {
      segs.push({ kind: "transition", index: i, start: cursor, end: cursor + TRANSITIONS[i].scroll });
      cursor += TRANSITIONS[i].scroll;
    }
  });
  segs.push({ kind: "outro", index: SCENES.length - 1, start: cursor, end: cursor + OUTRO_SCROLL });
  cursor += OUTRO_SCROLL;
  const total = cursor;
  segs.forEach((s) => {
    s.start /= total;
    s.end /= total;
  });
  return { segs, total };
}

const built = build();
export const SEGMENTS = built.segs;
/** Total scroll length of the experience in vh (the sticky stage adds 100vh on top). */
export const TOTAL_SCROLL_VH = built.total;

export const sceneSegment = (i: number) => SEGMENTS.find((s) => s.kind === "scene" && s.index === i)!;
export const outroSegment = SEGMENTS[SEGMENTS.length - 1];

/** Map a scene-local progress (0–1) to global progress. */
export const at = (scene: number, local: number) => {
  const s = sceneSegment(scene);
  return s.start + (s.end - s.start) * local;
};

export interface Layer {
  scene: number;
  /** fractional frame index */
  frame: number;
}

export interface Resolved {
  a: Layer;
  b: Layer | null;
  /** transition progress 0–1 (0 when b is null) */
  t: number;
  transition: TransitionDef | null;
  /** 0–1 progress of the final hold */
  outro: number;
  /** scene that "owns" the moment (for nav tone, preloading, progress dots) */
  active: number;
}

export function resolve(p: number): Resolved {
  const progress = Math.min(1, Math.max(0, p));
  let seg = SEGMENTS[SEGMENTS.length - 1];
  for (const s of SEGMENTS) {
    if (progress < s.end) {
      seg = s;
      break;
    }
  }
  const local = seg.end > seg.start ? (progress - seg.start) / (seg.end - seg.start) : 0;
  const last = (i: number) => SCENES[i].frames - 1;

  if (seg.kind === "scene") {
    return { a: { scene: seg.index, frame: local * last(seg.index) }, b: null, t: 0, transition: null, outro: 0, active: seg.index };
  }
  if (seg.kind === "transition") {
    return {
      a: { scene: seg.index, frame: last(seg.index) },
      b: { scene: seg.index + 1, frame: 0 },
      t: local,
      transition: TRANSITIONS[seg.index],
      outro: 0,
      active: local < 0.5 ? seg.index : seg.index + 1,
    };
  }
  return { a: { scene: seg.index, frame: last(seg.index) }, b: null, t: 0, transition: null, outro: local, active: seg.index };
}

/* ---------- small math helpers shared by the renderer and the captions ---------- */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (v: number) => {
  const x = clamp01(v);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
