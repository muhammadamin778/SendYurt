"use client";

import { useEffect, useRef, useState } from "react";

type State = "shown" | "hidden" | "revealed";

/**
 * Scroll-reveal that degrades safely: content renders VISIBLE by default,
 * so no-JS, slow hydration, and reduced-motion users always see it. Only
 * elements clearly below the fold are briefly hidden (off-screen, so no
 * visible flash) and then faded in when scrolled into view.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("shown");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      return; // stays visible, no animation
    }

    // Only animate elements that are safely below the current viewport —
    // anything already on screen stays visible so it can never flash.
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.9) return;

    setState("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setState("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className ?? ""}`}
      style={{
        transitionDelay: `${delay}ms`,
        ...(state === "hidden"
          ? { opacity: 0, transform: "translateY(12px)" }
          : null),
      }}
    >
      {children}
    </div>
  );
}
