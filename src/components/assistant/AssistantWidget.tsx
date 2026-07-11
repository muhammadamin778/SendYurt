"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { clsx } from "clsx";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  source?: "ai" | "guide";
}

const SPEECH_LANG: Record<string, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

/** Web Speech API is prefixed in Chrome; absent in some browsers. */
function getRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AssistantWidget() {
  const t = useTranslations("assistant");
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [degraded, setDegraded] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMicSupported(getRecognition() !== null);
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  // Stop any speech/listening when the panel closes.
  useEffect(() => {
    if (!open) {
      recognitionRef.current?.abort();
      setListening(false);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [open]);

  function speak(text: string) {
    if (!ttsSupported || !speakReplies) return;
    const lang = SPEECH_LANG[locale] ?? "en-US";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    // Prefer a voice matching the language; fall back to the browser default.
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = SPEECH_LANG[locale] ?? "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        inputRef.current?.focus();
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          // Send a bounded window of history; system context lives server-side.
          messages: nextMessages.slice(-12).map(({ role, content }) => ({ role, content })),
        }),
      });

      if (res.status === 429) {
        setMessages((m) => [...m, { role: "assistant", content: t("rateLimited"), source: "guide" }]);
        return;
      }
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: t("error"), source: "guide" }]);
        return;
      }
      const data = (await res.json()) as { reply: string; source: "ai" | "guide"; degraded?: boolean };
      setDegraded(Boolean(data.degraded) || data.source === "guide");
      setMessages((m) => [...m, { role: "assistant", content: data.reply, source: data.source }]);
      speak(data.reply);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: t("error"), source: "guide" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("title")}
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-samarkand-700 p-3.5 text-white shadow-lg transition-colors hover:bg-samarkand-800 print:hidden motion-safe:active:scale-95 md:bottom-6 md:right-6"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M21 12a8 8 0 01-8 8H5a2 2 0 01-2-2v-6a8 8 0 0116 0z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeLinecap="round" strokeWidth="2.5" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="fixed bottom-36 right-4 z-40 flex max-h-[70vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-arch border border-sand-200 bg-white shadow-card print:hidden motion-safe:animate-toast-in md:bottom-24 md:right-6"
        >
          <div className="border-b border-sand-100 px-5 pb-3 pt-6 text-center">
            <h2 className="font-display text-lg font-bold text-samarkand-950">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-sand-700">
              {degraded ? t("guideMode") : t("subtitle")}
            </p>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="rounded-lg bg-samarkand-50 px-3 py-2.5 text-sm leading-relaxed text-samarkand-900">
                {t("welcome")}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={clsx(
                  "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-samarkand-700 text-white"
                    : "bg-sand-100 text-ink",
                )}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="flex gap-1.5 px-2 py-1" aria-label={t("thinking")}>
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 animate-pulse rounded-full bg-samarkand-400"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={send} className="border-t border-sand-100 p-3">
            <div className="flex items-center gap-2">
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={listening ? t("micStop") : t("micStart")}
                  aria-pressed={listening}
                  className={clsx(
                    "shrink-0 rounded-lg border p-2 transition-colors motion-safe:active:scale-95",
                    listening
                      ? "border-terracotta-500 bg-terracotta-50 text-terracotta-700 motion-safe:animate-pulse"
                      : "border-sand-300 bg-white text-sand-800 hover:bg-sand-100",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? t("listening") : t("placeholder")}
                aria-label={t("placeholder")}
                maxLength={2000}
                className="min-w-0 flex-1 rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-sand-400 focus:border-samarkand-500 focus:outline-none focus:ring-2 focus:ring-samarkand-500"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={t("send")}
                className="shrink-0 rounded-lg bg-samarkand-700 p-2 text-white transition-colors hover:bg-samarkand-800 disabled:opacity-50 motion-safe:active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            {ttsSupported && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 px-1 text-xs text-sand-700">
                <input
                  type="checkbox"
                  checked={speakReplies}
                  onChange={(e) => setSpeakReplies(e.target.checked)}
                  className="h-3.5 w-3.5 accent-samarkand-700"
                />
                {t("speakReplies")}
              </label>
            )}
          </form>
        </div>
      )}
    </>
  );
}
