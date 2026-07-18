import type { DetailedHTMLProps, HTMLAttributes } from "react";

// The ElevenLabs Conversational AI embed registers a custom element,
// <elevenlabs-convai agent-id="…">. Declare it so JSX accepts it.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & { "agent-id": string },
        HTMLElement
      >;
    }
  }
}

export {};
