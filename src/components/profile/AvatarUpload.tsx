"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { removeProfileImage, updateProfileImage } from "@/app/actions/profile";
import { toast } from "@/components/ui/toast";

/** Downscale an image file to a square-ish data URL, ~256px, JPEG. */
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AvatarUpload({
  image,
  initial,
}: {
  image: string | null;
  initial: string;
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast(t("avatarError"), "error");
    setBusy(true);
    try {
      const dataUrl = await downscale(file);
      const res = await updateProfileImage(dataUrl);
      if (!res.ok) throw new Error(res.error);
      toast(t("avatarSaved"));
      router.refresh();
    } catch {
      toast(t("avatarError"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    const res = await removeProfileImage();
    setBusy(false);
    if (res.ok) {
      toast(t("avatarRemoved"));
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <span className="vision-grad-info grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl font-display text-2xl font-bold text-white">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={t("avatarChange")}
          className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-[#0b1437] text-white shadow-md transition-transform hover:scale-105 disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M4 8h3l2-2h6l2 2h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      {image && (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="text-xs font-semibold text-[#a0aec0] underline transition-colors hover:text-white disabled:opacity-60"
        >
          {t("avatarRemove")}
        </button>
      )}
    </div>
  );
}
