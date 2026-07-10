import { notFound } from "next/navigation";

// Any unmatched path under a valid locale renders the localized 404.
export default function CatchAllNotFound() {
  notFound();
}
