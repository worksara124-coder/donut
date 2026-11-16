"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import SplitWords from "./SplitWords";
import { useNavTone, useReveal } from "@/lib/hooks";

// three.js is only downloaded when the section approaches the viewport
const SprinkleField = dynamic(() => import("./SprinkleField"), { ssr: false });

export default function BrandStory() {
  const ref = useRef<HTMLElement>(null);
  const [mount3d, setMount3d] = useState(false);
  const [visible, setVisible] = useState(false);
  useNavTone(ref, "cream");
  useReveal(ref);

  useEffect(() => {
    const el = ref.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting && !reduced) setMount3d(true);
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="story" ref={ref} className="relative flex min-h-[100svh] items-center overflow-hidden bg-pink px-5 py-32 text-cream md:px-[5vw]">
      <div className="absolute inset-0" aria-hidden>
        {mount3d && <SprinkleField paused={!visible} />}
      </div>
      <div className="relative">
        <p data-reveal className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-butter">Our Story</p>
        <h2 data-reveal="words" className="display mt-5 text-[clamp(3.4rem,13.5vw,14.5rem)]">
          <SplitWords text="More than a donut." />
        </h2>
        <p data-reveal className="mt-8 max-w-[22ch] font-display text-[clamp(1.5rem,3.2vw,3rem)] font-medium leading-[1.15] text-butter md:ml-[34vw]">
          Little moments. Big flavors. A mood for every craving.
        </p>
      </div>
    </section>
  );
}
