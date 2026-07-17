"use client";

import { createContext, useContext, type ReactNode } from "react";

const PublisherAdminContext = createContext<string | null>(null);

export function PublisherAdminProvider({ publisherId, children }: { publisherId: string; children: ReactNode }) {
  return <PublisherAdminContext.Provider value={publisherId}>{children}</PublisherAdminContext.Provider>;
}

export function usePublisherAdminId() {
  const publisherId = useContext(PublisherAdminContext);
  if (!publisherId) throw new Error("Publisher Admin context is unavailable.");
  return publisherId;
}
