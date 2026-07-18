"use client";

import Script from "next/script";

/**
 * ElevenLabs Conversational AI widget — floating text + voice agent. The
 * custom element is upgraded once the embed script loads; the script is
 * fetched after the page is interactive so it never blocks first paint.
 */
export function ConvaiWidget() {
  return (
    <>
      <elevenlabs-convai agent-id="agent_8801kxdgf200ebx8aj1x01pa8xp0"></elevenlabs-convai>
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        async
      />
    </>
  );
}
