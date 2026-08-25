"use client";

import { createContext, useContext, type ReactNode } from "react";

const V2OverlayPortalTargetContext = createContext<HTMLElement | null>(null);

export function V2OverlayPortalProvider({
  target,
  children,
}: {
  target: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <V2OverlayPortalTargetContext.Provider value={target}>
      {children}
    </V2OverlayPortalTargetContext.Provider>
  );
}

export function useV2OverlayPortalTarget() {
  const target = useContext(V2OverlayPortalTargetContext);
  return target ?? (typeof document === "undefined" ? null : document.body);
}
