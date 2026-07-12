import { redirect } from "next/navigation";

// The marketing landing now lives at the site root ("/") as the pitch
// page. Any visit to a locale root (e.g. /en, /uz) sends the visitor
// there; register and log in are reached from the pitch.
export default function LocaleRoot() {
  redirect("/");
}
