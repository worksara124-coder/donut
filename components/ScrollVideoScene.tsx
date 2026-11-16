"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FrameStore } from "@/lib/frameStore";
import { Renderer } from "@/lib/renderer";
import { SCENES, resolve } from "@/lib/timeline";
import { experienceBus, setNavTone } from "@/lib/bus";
import { FRAMES_VERSION } from "@/lib/framesVersion";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  /** the tall section whose scroll range drives the film */
  triggerRef: RefObject<HTMLElement | null>;
  onReady: () => void;
  onLoadProgress?: (ratio: number) => void;
}

/**
 * The scroll-scrubbed film: scroll progress → frame index → canvas.
 * Nothing autoplays. Scrolling down plays forward, scrolling up plays
 * backward, stopping holds the frame. No React state on the scroll path.
 */
export default function ScrollVideoScene({ triggerRef, onReady, onLoadProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const trigger = triggerRef.current;
    if (!canvas || !trigger) return;
    const stage = canvas.parentElement!;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    // phones and small tablets only — laptops (e.g. 1366×768) keep the HD frames
    const small = window.innerWidth < 820 || (coarse && Math.min(window.innerWidth, window.innerHeight) < 600);
    const lite = small || !!nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);

    let dirty = true;
    const store = new FrameStore({
      variant: lite ? "m" : "d",
      // 1080p frames are ~8 MB once decoded: keep the decoded window small
      maxBitmaps: lite ? 28 : 40,
      concurrency: lite ? 4 : 6,
      onDirty: () => (dirty = true),
    });
    const renderer = new Renderer(canvas);

    const dprCap = 2;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const w = Math.min(2560, Math.round(stage.clientWidth * dpr));
      const h = Math.round((stage.clientHeight * w) / Math.max(1, stage.clientWidth));
      renderer.resize(w, h);
      dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    let target = 0;
    let current = 0;
    let inView = true;
    let activeScene = -1;
    let ready = false;
    let lastDrawn = -1;
    let direction: 1 | -1 = 1;

    const st = ScrollTrigger.create({
      trigger,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        target = self.progress;
      },
      onToggle: (self) => {
        inView = self.isActive || self.progress === 0;
        if (self.isActive && activeScene >= 0) setNavTone(SCENES[activeScene].tone);
      },
    });
    target = current = st.progress;

    store.request([0, 1]);

    // Loader fallback: never block the page on slow or failed media.
    const giveUp = window.setTimeout(() => {
      if (!ready) {
        ready = true;
        setFailed(true);
        onReady();
      }
    }, 9000);

    const tick = (_t: number, deltaMs: number) => {
      if (!ready) onLoadProgress?.(store.loadedRatio(0));
      if (!inView && ready && Math.abs(target - current) < 1e-5) return;

      // smooth interpolation toward the scroll position (frame-rate independent)
      const diff = target - current;
      if (Math.abs(diff) > 1e-5) {
        const k = reduced ? 1 : 1 - Math.exp((-deltaMs / 1000) * (coarse ? 10 : 16));
        current += diff * k;
        direction = diff > 0 ? 1 : -1;
        if (Math.abs(target - current) < 1e-5) current = target;
      }

      if (current === lastDrawn && !dirty) return;
      const r = resolve(current);

      if (r.active !== activeScene) {
        activeScene = r.active;
        // download the scene we are in, then the next one, then the previous one
        store.request([r.active, r.active + 1, r.active - 1]);
        if (st.isActive || current === 0) setNavTone(SCENES[r.active].tone);
      }

      const heads = [{ scene: r.a.scene, frame: r.a.frame }];
      if (r.b) heads.push({ scene: r.b.scene, frame: r.b.frame });
      store.setPlayheads(heads);

      const a = store.get(r.a.scene, r.a.frame, direction);
      const b = r.b ? store.get(r.b.scene, r.b.frame, direction) : null;
      dirty = false;
      const drawn = renderer.draw(r, a, b);
      if (drawn && !ready) {
        ready = true;
        window.clearTimeout(giveUp);
        canvas.style.opacity = "1";
        onReady();
      } else if (drawn) {
        canvas.style.opacity = "1";
      }
      if (current !== lastDrawn) experienceBus.emit({ progress: current, resolved: r });
      lastDrawn = current;
    };
    gsap.ticker.add(tick);
    experienceBus.emit({ progress: current, resolved: resolve(current) });

    return () => {
      window.clearTimeout(giveUp);
      gsap.ticker.remove(tick);
      st.kill();
      ro.disconnect();
      store.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Poster: visible until the first frame is painted, and if the sequence cannot load */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/frames/mood/poster.jpg?v=${FRAMES_VERSION}`}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-contain landscape:object-cover"
        fetchPriority="high"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-0"
        role="img"
        aria-label="MOOD donut film: hands pick two donuts out of the word MOOD, a sprinkled donut flies toward the camera, two donuts spin in chocolate and icing, then drop into a MOOD paper bag."
      />
      {failed && <span className="sr-only">The film could not be loaded; a still image is shown instead.</span>}
    </>
  );
}
