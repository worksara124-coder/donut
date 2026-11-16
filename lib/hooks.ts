"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setNavTone } from "./bus";
import type { NavTone } from "./timeline";

gsap.registerPlugin(ScrollTrigger);

/** Switches the navigation colour while `ref` sits under the header. */
export function useNavTone(ref: RefObject<HTMLElement | null>, tone: NavTone) {
  useEffect(() => {
    if (!ref.current) return;
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 48px",
      end: "bottom 48px",
      onToggle: (self) => self.isActive && setNavTone(tone),
    });
    return () => st.kill();
  }, [ref, tone]);
}

/**
 * Staggered rise-in for every [data-reveal] inside `ref`, triggered on scroll.
 * Uses gsap.context so every tween and ScrollTrigger is reverted on unmount.
 */
export function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const items = el.dataset.reveal === "words" ? el.querySelectorAll(".rw") : [el];
        gsap.from(items, {
          yPercent: el.dataset.reveal === "words" ? 110 : 0,
          y: el.dataset.reveal === "words" ? 0 : 40,
          opacity: el.dataset.reveal === "words" ? 1 : 0,
          rotate: el.dataset.reveal === "words" ? 6 : 0,
          duration: 1,
          ease: "power4.out",
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: "top 86%", toggleActions: "play none none reverse" },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, [ref]);
}
