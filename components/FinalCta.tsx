"use client";

import { useRef } from "react";
import SplitWords from "./SplitWords";
import { useNavTone, useReveal } from "@/lib/hooks";
import { site } from "@/lib/site";

export default function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  useNavTone(ref, "pink");
  useReveal(ref);
  const hasOrderUrl = site.orderUrl.length > 0;

  return (
    <section id="order" ref={ref} className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-butter px-5 py-28 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img data-reveal src="/images/mood-logo.webp" alt="MOOD" loading="lazy" className="w-[min(70vw,460px)]" />
      <h2 data-reveal="words" className="display mt-10 max-w-[12ch] text-[clamp(2.8rem,9.5vw,9.5rem)] text-pink">
        <SplitWords text="What’s your mood today?" />
      </h2>
      <div data-reveal className="mt-12">
        {/* Destination comes from NEXT_PUBLIC_ORDER_URL (see .env.example) */}
        <a
          href={hasOrderUrl ? site.orderUrl : "#order"}
          {...(hasOrderUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="btn btn-pink text-lg md:text-xl"
        >
          Get your mood <span className="arrow" aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
