"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Creative "comet" cursor — a bright cyan dot that tracks the pointer exactly
 * with a lagging ring that eases behind it and reacts to interactive elements
 * and clicks. Concept adapted for the web from the mouse_changer project
 * (which swaps native OS cursors).
 *
 * Pointer-and-hover capable, motion-OK, and at least a laptop-width viewport.
 * `(pointer: fine)` alone is not enough — a tablet with a trackpad or stylus
 * reports it — so hover and width are required too, and the query is watched
 * so plugging in a mouse or resizing takes effect without a reload.
 */

/** Below this the device is a phone or tablet regardless of pointer type. */
const MIN_WIDTH = 1024;
const CAPABLE = `(pointer: fine) and (hover: hover) and (min-width: ${MIN_WIDTH}px)`;
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  /**
   * Starts false so the server render and the first client render agree; a
   * capable device turns it on after mount.
   */
  const [enabled, setEnabled] = useState(false);

  // Decide whether this device gets the cursor at all, and keep watching:
  // resizing a laptop window down to tablet width should turn it off.
  useEffect(() => {
    const capable = window.matchMedia(CAPABLE);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(capable.matches && !reduce.matches);
    sync();
    capable.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    return () => {
      capable.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
    };
  }, []);

  // Attach the animation only once the elements actually exist. This used to
  // live in the effect above, which set `enabled` and then read the refs in the
  // same pass — before the render that creates them. The refs were null, the
  // effect returned early, and the ring was painted with nothing to move it:
  // a stray circle parked in the corner.
  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.documentElement.classList.add("has-custom-cursor");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      const interactive = (e.target as Element | null)?.closest?.(
        "a, button, input, select, textarea, label, [role='button'], summary",
      );
      ring.classList.toggle("is-pointer", !!interactive);
    };
    const onDown = () => ring.classList.add("is-down");
    const onUp = () => ring.classList.remove("is-down");
    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    const onEnter = () => {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return (
    <>
      {enabled && (
        <>
          <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
          <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
        </>
      )}
    </>
  );
}
