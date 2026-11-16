"use client";

import { useEffect, useRef } from "react";
import { experienceBus } from "@/lib/bus";
import { at, outroSegment, smooth } from "@/lib/timeline";
import { site } from "@/lib/site";

/** End card of the film: exact logo, slogan and CTA, revealed by the last stretch of scroll. */
export default function PackagingReveal() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const logo = el.querySelector<HTMLElement>("[data-logo]")!;
    const words = [...el.querySelectorAll<HTMLElement>("[data-word]")];
    const cta = el.querySelector<HTMLElement>("[data-cta]")!;
    const start = at(3, 0.9);
    const end = outroSegment.start + (outroSegment.end - outroSegment.start) * 0.6;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let on = false;

    return experienceBus.subscribe(({ progress: p }) => {
      const v = (p - start) / (end - start);
      if (v <= 0) {
        if (on) {
          el.style.visibility = "hidden";
          on = false;
        }
        return;
      }
      on = true;
      el.style.visibility = "visible";
      const set = (node: HTMLElement, k: number, y = 28) => {
        node.style.opacity = String(k);
        if (!reduced) node.style.transform = `translate3d(0, ${(1 - k) * y}px, 0) scale(${0.94 + 0.06 * k})`;
      };
      set(logo, smooth(v / 0.45));
      words.forEach((w, i) => set(w, smooth((v - 0.28 - i * 0.07) / 0.35), 22));
      const c = smooth((v - 0.62) / 0.38);
      set(cta, c, 18);
      cta.style.pointerEvents = c > 0.6 ? "auto" : "none";
    });
  }, []);

  return (
    <div ref={root} className="stage-safe invisible flex flex-col items-center px-6 pt-[17vh] text-center landscape:pt-[11vh]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img data-logo src="/images/mood-logo.webp" alt="MOOD" className="w-[min(62vw,300px)] opacity-0 landscape:w-[clamp(180px,27vw,440px)]" />
      <p className="display mt-4 text-[clamp(1.7rem,7.4vw,2.6rem)] text-pink landscape:mt-[2vh] landscape:text-[clamp(1.4rem,3.4vw,3.4rem)]">
        {site.secondarySlogan.split(" ").map((w, i) => (
          <span key={i} data-word className="inline-block opacity-0">
            {w}&nbsp;
          </span>
        ))}
      </p>
      <a data-cta href="#flavors" className="btn btn-pink pointer-events-none mt-6 text-sm opacity-0 landscape:mt-[3vh] md:text-base">
        Explore our donuts <span className="arrow" aria-hidden>→</span>
      </a>
    </div>
  );
}
