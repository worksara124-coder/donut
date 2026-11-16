"use client";

import { useEffect, useRef } from "react";
import { experienceBus } from "@/lib/bus";
import { at } from "@/lib/timeline";

/** Chapter starts along the film (scenes 1 and 2 share one shot). */
const CHAPTERS = [at(0, 0), at(0, 0.62), at(1, 0), at(2, 0), at(3, 0)];

/** Thin progress rail for the film: vertical on wide screens, a top bar on phones. */
export default function ScrollProgressIndicator() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const dots = [...el.querySelectorAll<HTMLElement>("[data-dot]")];
    const count = el.querySelector<HTMLElement>("[data-count]")!;
    let chapter = -1;
    return experienceBus.subscribe(({ progress: p }) => {
      el.style.setProperty("--p", p.toFixed(4));
      el.style.opacity = p >= 0.9995 ? "0" : "1";
      let c = 0;
      CHAPTERS.forEach((start, i) => p >= start - 0.0005 && (c = i));
      if (c !== chapter) {
        chapter = c;
        dots.forEach((d, i) => d.classList.toggle("is-on", i <= c));
        count.textContent = `0${c + 1}`;
      }
    });
  }, []);

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed z-40 transition-opacity duration-500" style={{ color: "var(--nav-fg)" }}>
      {/* phones: top bar */}
      <div className="fixed inset-x-0 top-0 h-[3px] bg-current/15 md:hidden">
        <div className="h-full origin-left bg-current" style={{ transform: "scaleX(var(--p, 0))" }} />
      </div>
      {/* wide screens: vertical rail */}
      <div className="fixed right-[2.2vw] top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex">
        <span data-count className="font-display text-xs font-semibold tracking-widest">
          01
        </span>
        <div className="relative h-[26vh] w-[3px] rounded bg-current/20">
          <div className="absolute inset-0 origin-top rounded bg-current" style={{ transform: "scaleY(var(--p, 0))" }} />
          {CHAPTERS.map((c, i) => (
            <span
              key={i}
              data-dot
              className="absolute left-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 scale-75 rounded-full border-2 border-current bg-butter transition-[transform,background-color] duration-300 [&.is-on]:scale-100 [&.is-on]:bg-current"
              style={{ top: `${c * 100}%` }}
            />
          ))}
        </div>
        <span className="font-display text-xs font-semibold tracking-widest opacity-50">05</span>
      </div>
    </div>
  );
}
