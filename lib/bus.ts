/**
 * Tiny pub/sub between the scroll engine and the DOM overlays.
 * Subscribers mutate styles directly — no React state on the scroll path.
 */
import type { NavTone, Resolved } from "./timeline";

export interface ExperienceState {
  progress: number;
  resolved: Resolved;
}

type Listener = (s: ExperienceState) => void;
const listeners = new Set<Listener>();
let last: ExperienceState | null = null;

export const experienceBus = {
  emit(s: ExperienceState) {
    last = s;
    listeners.forEach((l) => l(s));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    if (last) l(last);
    return () => {
      listeners.delete(l);
    };
  },
};

export function setNavTone(tone: NavTone) {
  if (typeof document !== "undefined" && document.documentElement.dataset.navTone !== tone) {
    document.documentElement.dataset.navTone = tone;
  }
}
