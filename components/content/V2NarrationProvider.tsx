"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import V2ReadAloudPlayer from "@/components/content/V2ReadAloudPlayer";
import type { BookNarrationManifest } from "@/lib/content-narration";

export type V2NarrationSegmentRequest = { segmentId: string; token: number };

type V2NarrationContextValue = {
  manifest: BookNarrationManifest;
  activeSegmentId: string | null;
  requestSegment: (segmentId: string) => void;
};

const V2NarrationContext = createContext<V2NarrationContextValue | null>(null);

export function useV2NarrationContext() {
  return useContext(V2NarrationContext);
}

export default function V2NarrationProvider({
  manifest,
  audioUrls = {},
  children,
}: {
  manifest: BookNarrationManifest;
  audioUrls?: Record<string, string>;
  children: ReactNode;
}) {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [segmentRequest, setSegmentRequest] = useState<V2NarrationSegmentRequest | null>(null);
  const requestSegment = useCallback((segmentId: string) => {
    setSegmentRequest((previous) => ({ segmentId, token: (previous?.token ?? 0) + 1 }));
  }, []);
  const value = useMemo(() => ({ manifest, activeSegmentId, requestSegment }), [activeSegmentId, manifest, requestSegment]);
  return (
    <V2NarrationContext.Provider value={value}>
      {children}
      <div className="sticky bottom-3 z-40 mt-4">
        <V2ReadAloudPlayer manifest={manifest} audioUrls={audioUrls} requestedSegment={segmentRequest} onActiveSegmentChange={setActiveSegmentId} />
      </div>
    </V2NarrationContext.Provider>
  );
}