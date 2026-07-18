"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

/**
 * ElevenLabs Conversational AI widget — floating text + voice agent.
 *
 * The embed pins a fairly large launcher to the bottom-right corner, which can
 * cover page content. We make it (a) smaller and (b) draggable by applying a
 * CSS `transform` to the custom element: a transform on the host reparents any
 * `position: fixed` shadow-DOM descendants to it, so translating/scaling the
 * host reliably moves and shrinks the whole widget without touching its
 * internal layout. A small grip button drives the same transform vars.
 */
export function ConvaiWidget() {
  const drag = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null);
  const cur = useRef({ x: 0, y: 0 });

  const onMove = useCallback((e: PointerEvent) => {
    if (!drag.current) return;
    // Widget is anchored bottom-right, so only negative offsets move it on-screen.
    const x = Math.min(0, Math.max(-(window.innerWidth - 140), drag.current.bx + (e.clientX - drag.current.sx)));
    const y = Math.min(0, Math.max(-(window.innerHeight - 180), drag.current.by + (e.clientY - drag.current.sy)));
    cur.current = { x, y };
    const r = document.documentElement.style;
    r.setProperty("--convai-x", `${x}px`);
    r.setProperty("--convai-y", `${y}px`);
  }, []);

  const onUp = useCallback(() => {
    drag.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }, [onMove]);

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      drag.current = { sx: e.clientX, sy: e.clientY, bx: cur.current.x, by: cur.current.y };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onMove, onUp],
  );

  return (
    <>
      <style>{`
        elevenlabs-convai {
          transform: translate(var(--convai-x, 0px), var(--convai-y, 0px)) scale(0.8) !important;
          transform-origin: bottom right;
        }
      `}</style>

      <elevenlabs-convai agent-id="agent_8801kxdgf200ebx8aj1x01pa8xp0"></elevenlabs-convai>

      {/* Drag grip — sits just above the launcher and moves with it. */}
      <button
        type="button"
        onPointerDown={onDown}
        aria-label="Move assistant"
        title="Drag to move the assistant"
        className="fixed z-[51] flex cursor-grab touch-none items-center gap-1 rounded-full border border-[#e2e8f0] bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#64748b] shadow-md backdrop-blur-sm active:cursor-grabbing print:hidden"
        style={{ right: 16, bottom: 92, transform: "translate(var(--convai-x, 0px), var(--convai-y, 0px))" }}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
        </svg>
        Move
      </button>

      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        async
      />
    </>
  );
}
