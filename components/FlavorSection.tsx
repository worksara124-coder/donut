"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import SplitWords from "./SplitWords";
import { useNavTone, useReveal } from "@/lib/hooks";

const FLAVORS = [
  {
    id: "chocolate",
    name: "Chocolate Mood",
    text: "Rich chocolate glaze with colorful sprinkles.",
    img: "/images/chocolate-donut.webp",
    tilt: -14,
    color: "text-choc",
  },
  {
    id: "vanilla",
    name: "Vanilla Mood",
    text: "Creamy white frosting with rainbow sprinkles.",
    img: "/images/vanilla-donut.webp",
    tilt: 14,
    color: "text-pink",
  },
];

export default function FlavorSection() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  useNavTone(ref, "pink");
  useReveal(ref);

  return (
    <section id="flavors" ref={ref} className="relative overflow-hidden bg-butter px-5 pb-28 pt-32 md:px-[5vw] md:pb-40 md:pt-44">
      <p data-reveal className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-pink">Flavors</p>
      <h2 data-reveal="words" className="display mt-4 text-[clamp(3.2rem,12.5vw,13rem)] text-pink">
        <SplitWords text="Find your mood." />
      </h2>

      <div className="mt-14 grid gap-20 md:mt-24 md:grid-cols-2 md:gap-[6vw]">
        {FLAVORS.map((f, i) => {
          const on = active === f.id;
          return (
            <motion.article
              key={f.id}
              data-reveal
              className={`group relative cursor-pointer select-none ${i === 1 ? "md:mt-32" : ""}`}
              onHoverStart={() => setActive(f.id)}
              onHoverEnd={() => setActive(null)}
              onTap={() => setActive((v) => (v === f.id ? null : f.id))}
            >
              <div className="relative mx-auto aspect-square w-[78%] max-w-[520px]">
                {/* soft plate */}
                <motion.span
                  aria-hidden
                  className="absolute inset-[6%] rounded-full bg-butter-deep"
                  animate={{ scale: on ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 16 }}
                />
                <motion.div
                  className="absolute inset-0"
                  animate={{ scale: on ? 1.1 : 1, rotate: on ? f.tilt : 0, y: on ? -10 : 0 }}
                  transition={{ type: "spring", stiffness: 120, damping: 12 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.img}
                    alt={`${f.name} donut`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={`floaty h-full w-full object-contain drop-shadow-[0_30px_30px_rgba(71,33,15,0.28)] ${i === 1 ? "floaty-late" : ""}`}
                  />
                </motion.div>
              </div>

              <h3 className={`display mt-8 flex flex-wrap text-[clamp(2.4rem,6.2vw,6rem)] ${f.color}`} aria-label={f.name}>
                {f.name.split(" ").map((word, wi) => (
                  <span key={wi} aria-hidden className="mr-[0.25em] inline-block whitespace-nowrap">
                    {word.split("").map((ch, ci) => {
                      const n = wi * 9 + ci;
                      return (
                        <motion.span
                          key={ci}
                          className="inline-block"
                          animate={{ y: on ? [0, -14, 0] : 0, rotate: on ? [0, n % 2 ? 5 : -5, 0] : 0 }}
                          transition={{ duration: 0.55, delay: on ? n * 0.028 : 0, ease: "easeOut" }}
                        >
                          {ch}
                        </motion.span>
                      );
                    })}
                  </span>
                ))}
              </h3>
              <p className="mt-3 max-w-[30ch] text-lg font-medium text-choc/80 md:text-xl">{f.text}</p>
            </motion.article>
          );
        })}
      </div>

      <div data-reveal className="mt-20 flex justify-center md:mt-28">
        <a href="#order" className="btn btn-pink text-base md:text-lg">
          Choose your mood <span className="arrow" aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
