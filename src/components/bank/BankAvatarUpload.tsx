"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { removeProfileImage, updateProfileImage } from "@/app/actions/profile";
import { toast } from "@/components/ui/toast";

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

export function BankAvatarUpload({ image, initial }: { image: string | null; initial: string }) {
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
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <span className="grid h-[90px] w-[90px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#0a7c53] to-[#34d399] font-sans text-3xl font-bold text-white">
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
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-[#065f3e] text-white shadow-md transition-transform hover:scale-105 disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      {image && (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="text-xs font-semibold text-[#94a3b8] underline transition-colors hover:text-[#0a7c53] disabled:opacity-60"
        >
          {t("avatarRemove")}
        </button>
      )}
    </div>
  );
}
