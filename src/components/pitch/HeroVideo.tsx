"use client";

import { useEffect, useRef } from "react";

/**
 * The hero product clip. Rendered inside a rounded device frame on the
 * bright Monzo-style hero (the frame + panel live in the page), so this
 * component is just the video: fills its parent, muted + looped, and holds
 * on its first frame when the visitor prefers reduced motion.
 */
export function HeroVideo({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      v.autoplay = false;
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* seeking before metadata loads is harmless */
      }
    } else {
      v.play?.().catch(() => {});
    }
  }, []);

  return (
    <video
      ref={ref}
      className={`h-full w-full object-cover ${className ?? ""}`}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src="/hero-bg.mp4" type="video/mp4" />
    </video>
  );
}
