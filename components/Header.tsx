"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { navLinks } from "@/lib/site";

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 md:px-[5vw] md:py-5" style={{ color: "var(--nav-fg)" }}>
        <a href="#experience" aria-label="MOOD — back to top" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/mood-logo.webp" alt="MOOD" className="h-7 w-auto md:h-9" />
        </a>

        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="group relative font-display text-[15px] font-semibold uppercase tracking-[0.12em] transition-colors duration-500">
              {l.label}
              <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 rounded bg-current transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
          <a
            href="#order"
            className="rounded-full px-5 py-2.5 font-display text-[15px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,transform] duration-500 hover:-translate-y-0.5"
            style={{ background: "var(--nav-pill-bg)", color: "var(--nav-pill-fg)" }}
          >
            Order Now
          </a>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <a
            href="#order"
            className="rounded-full px-4 py-2.5 font-display text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors duration-500"
            style={{ background: "var(--nav-pill-bg)", color: "var(--nav-pill-fg)" }}
          >
            Order Now
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative z-[60] grid h-11 w-11 place-items-center"
          >
            <span className="relative block h-3 w-6">
              <span className={`absolute left-0 top-0 h-[3px] w-full rounded bg-current transition-transform duration-300 ${open ? "translate-y-[4.5px] rotate-45" : ""}`} />
              <span className={`absolute bottom-0 left-0 h-[3px] w-full rounded bg-current transition-transform duration-300 ${open ? "-translate-y-[4.5px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            className="fixed inset-0 z-40 flex flex-col justify-center gap-2 bg-pink px-7 text-cream md:hidden"
            initial={{ clipPath: "circle(0% at calc(100% - 42px) 38px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 42px) 38px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 42px) 38px)" }}
            transition={{ duration: 0.55, ease: [0.7, 0, 0.2, 1] }}
          >
            {[...navLinks, { label: "Order Now", href: "#order" }].map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="display py-2 text-[15vw]"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {l.label}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
