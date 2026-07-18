"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateProfileName } from "@/app/actions/profile";
import { toast } from "@/components/ui/toast";
import { BankAvatarUpload } from "@/components/bank/BankAvatarUpload";

export interface ReadOnlyField {
  label: string;
  value: string;
  type?: string;
}

export function EditProfileForm({
  image,
  initial,
  name: initialName,
  nameLabel,
  fields,
  save,
}: {
  image: string | null;
  initial: string;
  name: string;
  nameLabel: string;
  fields: ReadOnlyField[];
  save: string;
}) {
  const t = useTranslations("bank");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast(t("yourName"), "error");
    setBusy(true);
    const res = await updateProfileName(name.trim());
    setBusy(false);
    if (res.ok) {
      toast(save);
      router.refresh();
    } else {
      toast(t("yourName"), "error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8 lg:flex-row">
      <div className="flex justify-center lg:pt-1">
        <BankAvatarUpload image={image} initial={initial} />
      </div>

      <div className="flex-1">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[15px] text-[#0f172a]">{nameLabel}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="bank-input" />
          </label>

          {fields.map((f) => (
            <label key={f.label} className="block">
              <span className="mb-2 block text-[15px] text-[#0f172a]">{f.label}</span>
              <input
                value={f.value}
                type={f.type ?? "text"}
                readOnly
                className="bank-input cursor-default text-[#94a3b8]"
              />
            </label>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded-2xl bg-[#065f3e] px-14 py-3.5 text-[16px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "…" : save}
          </button>
        </div>
      </div>
    </form>
  );
}
