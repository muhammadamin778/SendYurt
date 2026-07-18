"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addHouseholdMember } from "@/app/actions/profile";
import { toast } from "@/components/ui/toast";

export function AddMemberForm() {
  const t = useTranslations("profile");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"SENDER" | "RECEIVER">("RECEIVER");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast(t("memberNameError"), "error");
    setBusy(true);
    const res = await addHouseholdMember({ name: name.trim(), role });
    setBusy(false);
    if (!res.ok) {
      toast(res.error === "limit" ? t("memberLimit") : t("memberError"), "error");
      return;
    }
    setCreated({ email: res.email, tempPassword: res.tempPassword });
    setName("");
    router.refresh();
  }

  if (created) {
    return (
      <div className="vision-soft p-4">
        <p className="text-sm font-semibold text-white">{t("memberCreated")}</p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[#a0aec0]">{t("memberEmail")}</dt>
            <dd className="font-mono text-white">{created.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#a0aec0]">{t("memberPassword")}</dt>
            <dd className="font-mono text-[#21d4fd]">{created.tempPassword}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-[#7c88a0]">{t("memberShareNote")}</p>
        <button
          type="button"
          onClick={() => setCreated(null)}
          className="mt-3 rounded-lg border border-white/14 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
        >
          {t("memberDone")}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/14 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
      >
        {t("addMember")} +
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="vision-soft space-y-3 p-4" noValidate>
      <div>
        <label htmlFor="mbr-name" className="block text-xs font-semibold text-[#cbd5e1]">
          {t("memberName")}
        </label>
        <input
          id="mbr-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-white/14 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#7c88a0] focus:border-[#21d4fd] focus:outline-none focus:ring-2 focus:ring-[#21d4fd]/30"
          placeholder={t("memberNamePlaceholder")}
        />
      </div>
      <div>
        <label htmlFor="mbr-role" className="block text-xs font-semibold text-[#cbd5e1]">
          {t("memberRole")}
        </label>
        <select
          id="mbr-role"
          value={role}
          onChange={(e) => setRole(e.target.value as "SENDER" | "RECEIVER")}
          className="mt-1.5 w-full rounded-lg border border-white/14 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#21d4fd] focus:outline-none focus:ring-2 focus:ring-[#21d4fd]/30"
        >
          <option value="RECEIVER">{t("roleReceiverTitle")}</option>
          <option value="SENDER">{t("roleSenderTitle")}</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="vision-grad-info rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? t("memberAdding") : t("addMember")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-white/14 bg-white/5 px-4 py-2 text-sm font-semibold text-[#a0aec0] transition-colors hover:bg-white/10"
        >
          {t("memberCancel")}
        </button>
      </div>
    </form>
  );
}
