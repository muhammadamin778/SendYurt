"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { logUserVisit } from "@/lib/logVisit";

/**
 * Mounts once in the authenticated layouts and records a visit whenever the
 * route changes. Renders nothing. Uses a ref to skip duplicate consecutive
 * paths (e.g. React re-renders / Strict Mode double-invokes in dev).
 */
export function VisitLogger() {
  const pathname = usePathname();
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastLogged.current === pathname) return;
    lastLogged.current = pathname;
    void logUserVisit(pathname);
  }, [pathname]);

  return null;
}
