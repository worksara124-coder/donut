"use client";

import { useEffect, useRef, useState } from "react";
import ScrollVideoScene from "./ScrollVideoScene";
import SceneCaptions from "./SceneCaptions";
import PackagingReveal from "./PackagingReveal";
import { TOTAL_SCROLL_VH } from "@/lib/timeline";
import { experienceBus } from "@/lib/bus";

/**
 * The whole film lives in one tall section with one sticky, full-screen stage.
 * A single canvas plays all scenes, so there is no seam between "players".
 */
export default function HeroExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Scroll hint fades as soon as the film starts moving.
  useEffect(
    () =>
      experienceBus.subscribe(({ progress }) => {
        if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - progress * 90));
      }),
    [],
  );

  // Cursor parallax for the typography only (the film itself is never transformed).
  useEffect(() => {
    const stage = stageRef.current!;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0,
      ty = 0,
      x = 0,
      y = 0,
      raf = 0;
    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      stage.style.setProperty("--mx", x.toFixed(4));
      stage.style.setProperty("--my", y.toFixed(4));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -2;
      ty = (e.clientY / window.innerHeight - 0.5) * -2;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="experience"
      ref={sectionRef}
      className="exp relative"
      style={{ ["--exp-scroll" as string]: TOTAL_SCROLL_VH }}
      aria-label="The MOOD experience"
    >
      <div ref={stageRef} className="stage sticky top-0 w-full overflow-hidden bg-butter">
        <ScrollVideoScene
          triggerRef={sectionRef}
          onReady={() => setReady(true)}
          onLoadProgress={(r) => {
            if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, 0.08 + r * 4)})`;
          }}
        />
        <SceneCaptions />
        <PackagingReveal />

        {/* scroll hint */}
        <div ref={hintRef} className="stage-safe pointer-events-none flex items-end justify-center pb-6 landscape:justify-start landscape:pl-[5vw] landscape:pb-[9vh]">
          <div className="flex flex-col items-center gap-2 text-pink">
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.3em]">Scroll</span>
            <span className="relative block h-10 w-[2px] overflow-hidden rounded bg-pink/20">
              <span className="hint-line absolute inset-0 bg-pink" style={{ animation: "hint 1.8s ease-in-out infinite" }} />
            </span>
          </div>
        </div>

        {/* first-load veil — only ever shown once, never between scenes */}
        <div
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-butter transition-opacity duration-700 ${
            ready ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          aria-hidden={ready}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/mood-logo.webp" alt="MOOD" className="loader-bob w-[min(56vw,260px)]" style={{ animation: "loader-bob 1.6s ease-in-out infinite" }} />
          <span className="block h-[5px] w-36 overflow-hidden rounded-full bg-pink/15">
            <span ref={barRef} className="block h-full origin-left scale-x-[0.08] rounded-full bg-pink transition-transform duration-300" />
          </span>
        </div>
      </div>
    </section>
  );
}
