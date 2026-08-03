"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

/**
 * ElevenLabs Conversational AI widget — floating text + voice agent.
 *
 * The embed pins a fairly large launcher to the bottom-right corner where it
 * covers page content, so we shrink it and let the user move it out of the way.
 * Both are done with a CSS `transform` on the custom element: a transform on
 * the host reparents any `position: fixed` shadow-DOM descendants to it, so
 * translating/scaling the host moves the whole widget without touching its
 * internal layout.
 *
 * **Dragging the widget itself**, with no separate grip. A handle button to
 * move a floating thing is just a second floating thing, so instead we listen
 * on a wrapper: pointer events raised inside the widget's shadow DOM are
 * composed, so they bubble out to an ancestor in the light DOM even though the
 * widget paints somewhere else entirely.
 *
 * A tap and a drag start identically, so they are told apart by distance:
 * under DRAG_THRESHOLD the gesture is left completely alone and reaches "Start
 * a call" normally; past it the widget moves, and the click that the browser
 * fires afterwards is swallowed once so releasing a drag over the button does
 * not also place a call.
 */

/** Pixels of travel before a press becomes a drag rather than a tap. */
const DRAG_THRESHOLD = 6;

/** Keeps a dragged widget from being pushed fully off-screen. */
const KEEP_VISIBLE = { x: 140, y: 180 };

export function ConvaiWidget() {
  const hostRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null);
  const cur = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const apply = useCallback((x: number, y: number) => {
    cur.current = { x, y };
    const root = document.documentElement.style;
    root.setProperty("--convai-x", `${x}px`);
    root.setProperty("--convai-y", `${y}px`);
  }, []);

  const onMove = useCallback(
    (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;

      const dx = e.clientX - s.sx;
      const dy = e.clientY - s.sy;

      if (!dragging.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return; // still a tap
        dragging.current = true;
        // Only suppress text selection etc. once this is definitely a drag.
        document.body.style.userSelect = "none";
      }

      // Anchored bottom-right, so only negative offsets move it on-screen.
      apply(
        Math.min(0, Math.max(-(window.innerWidth - KEEP_VISIBLE.x), s.bx + dx)),
        Math.min(0, Math.max(-(window.innerHeight - KEEP_VISIBLE.y), s.by + dy)),
      );
    },
    [apply],
  );

  const onUp = useCallback(() => {
    const wasDrag = dragging.current;
    start.current = null;
    dragging.current = false;
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);

    if (wasDrag) {
      // The browser still fires a click after the drag's pointerup. Eat exactly
      // one, in the capture phase, so letting go over "Start a call" doesn't
      // start a call.
      const swallow = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      // If no click follows (a drag ending outside the widget), don't leave the
      // listener armed to eat an unrelated click later.
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    }
  }, [onMove]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onDown = (e: PointerEvent) => {
      // Left button / touch / pen only.
      if (e.button !== 0) return;
      start.current = { sx: e.clientX, sy: e.clientY, bx: cur.current.x, by: cur.current.y };
      dragging.current = false;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    host.addEventListener("pointerdown", onDown);
    return () => {
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onMove, onUp]);

  return (
    <>
      <style>{`
        /* Small enough to stay out of the way. On a phone the launcher sat on
           top of the bottom nav and the last row of content, so it is scaled
           down further and lifted clear of the nav bar. */
        elevenlabs-convai {
          transform: translate(var(--convai-x, 0px), var(--convai-y, calc(-1 * var(--convai-lift, 0px)))) scale(0.6) !important;
          transform-origin: bottom right;
          /* Without this a touch-drag scrolls the page instead of moving the
             widget. Safe on an element this small — there is nothing to scroll
             inside it. */
          touch-action: none;
        }
        :root { --convai-lift: 76px; }
        @media (min-width: 1024px) { :root { --convai-lift: 0px; } }
      `}</style>

      {/* `display: contents` generates no box, so this wrapper changes nothing
          visually — it exists purely to catch pointer events bubbling out of
          the widget's shadow DOM. */}
      <div ref={hostRef} style={{ display: "contents" }}>
        <elevenlabs-convai agent-id="agent_8801kxdgf200ebx8aj1x01pa8xp0"></elevenlabs-convai>
      </div>

      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        async
      />
    </>
  );
}
