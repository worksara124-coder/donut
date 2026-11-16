"use client";

import { useEffect, useRef } from "react";
import { experienceBus } from "@/lib/bus";
import { at, clamp01, smooth } from "@/lib/timeline";

interface Caption {
  lines: string[];
  scene: number;
  /** scene-local in/out (0–1). `from: null` = already on screen when the page opens */
  from: number | null;
  to: number;
  pos: "pos-br" | "pos-bl" | "pos-tl" | "pos-bc";
  tone: "pink" | "cream";
  /** parallax depth for the cursor */
  depth: number;
  as?: "h1" | "p";
}

const CAPTIONS: Caption[] = [
  // scene 1: out once both donuts are taken (frame ≈ 85 of 190)
  { lines: ["Pick your", "mood."], scene: 0, from: null, to: 0.4, pos: "pos-br", tone: "pink", depth: 14, as: "h1" },
  // scene 2 starts once the letters have parted (frame ≈ 122)
  { lines: ["Not just", "a donut."], scene: 0, from: 0.66, to: 0.82, pos: "pos-bl", tone: "pink", depth: 18 },
  { lines: ["It’s a", "mood."], scene: 0, from: 0.84, to: 1, pos: "pos-br", tone: "pink", depth: 18 },
  // out well before the frosting fills the frame
  { lines: ["Get closer."], scene: 1, from: 0.06, to: 0.46, pos: "pos-bc", tone: "pink", depth: 10 },
  { lines: ["Two", "flavors."], scene: 2, from: 0.1, to: 0.46, pos: "pos-tl", tone: "cream", depth: 20 },
  { lines: ["Endless", "moods."], scene: 2, from: 0.54, to: 0.92, pos: "pos-br", tone: "cream", depth: 20 },
];

/** Scroll-synchronised typography. Styles are written straight to the DOM. */
export default function SceneCaptions() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const nodes = [...el.querySelectorAll<HTMLElement>(".caption")];
    const words = nodes.map((n) => [...n.querySelectorAll<HTMLElement>(".w")]);
    const ranges = CAPTIONS.map((c) => ({
      a: c.from === null ? -1 : at(c.scene, c.from),
      b: at(c.scene, c.to),
    }));
    const shown = new Array(nodes.length).fill(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const unsub = experienceBus.subscribe(({ progress: p }) => {
      nodes.forEach((node, i) => {
        const { a, b } = ranges[i];
        const span = b - Math.max(0, a);
        const fi = span * 0.32;
        const fo = span * 0.26;
        const visible = p >= a - 0.0005 && p <= b;
        if (!visible) {
          if (shown[i]) {
            node.style.opacity = "0";
            node.style.visibility = "hidden";
            shown[i] = false;
          }
          return;
        }
        shown[i] = true;
        const out = smooth((p - (b - fo)) / fo);
        const life = clamp01((p - Math.max(0, a)) / span);
        let minIn = 1;
        words[i].forEach((w, wi) => {
          const win = a < 0 ? 1 : smooth((p - a - wi * fi * 0.16) / fi);
          minIn = Math.min(minIn, win);
          w.style.opacity = String(win);
          if (!reduced) w.style.transform = `translate3d(0, ${(1 - win) * 0.55}em, 0) rotate(${(1 - win) * 5}deg)`;
        });
        node.style.visibility = "visible";
        node.style.opacity = String(1 - out);
        if (!reduced) {
          node.style.transform = `translate3d(calc(var(--mx, 0) * ${CAPTIONS[i].depth}px), calc(var(--my, 0) * ${
            CAPTIONS[i].depth * 0.6
          }px - ${out * 1.1}em), 0) scale(${0.97 + life * 0.06})`;
        }
      });
    });
    return unsub;
  }, []);

  return (
    <div ref={root} className="stage-safe pointer-events-none">
      {CAPTIONS.map((c, i) => {
        const Tag = c.as ?? "p";
        return (
          <Tag key={i} className={`caption display ${c.pos} caption-${c.tone}`}>
            {c.lines.map((line, li) => (
              <span key={li} className="block">
                {line.split(" ").map((word, wi) => (
                  <span key={wi} className="w">
                    {word}
                    {wi < line.split(" ").length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}
