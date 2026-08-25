"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { V2OverlayPortalProvider } from "@/components/content/v2/V2OverlayPortalContext";

type TeachModeClassroomContextValue = {
  currentPage: number | null;
  setCurrentPage: (page: number) => void;
};

const TeachModeClassroomContext = createContext<TeachModeClassroomContextValue | null>(null);

export function useTeachModeClassroom() {
  return useContext(TeachModeClassroomContext);
}

type Props = {
  children: ReactNode;
  backHref: string;
  subjectLabel?: string;
  initialPage?: number | null;
};

export default function TeachModeShell({
  children,
  subjectLabel,
  initialPage = null,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const overlayHostRef = useRef<HTMLDivElement>(null);
  const [overlayHost, setOverlayHost] =
    useState<HTMLElement | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number | null>(initialPage);

  useEffect(() => {
    setOverlayHost(overlayHostRef.current);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setActive(
        document.fullscreenElement ===
          shellRef.current,
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange,
    );

    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
  }, []);

  const enterTeachingMode = () => {
    setError(null);
    setActive(true);

    const element = shellRef.current;

    if (!element?.requestFullscreen) {
      setError(
        "Fullscreen is not available in this browser. Teaching Mode is still open.",
      );
      return;
    }

    void element
      .requestFullscreen()
      .catch(() => {
        setError(
          "Fullscreen could not be opened. Teaching Mode is still available in this tab.",
        );
      });
  };

  const exitTeachingMode = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);

    setActive(false);
  };

  return (
    <div
      ref={shellRef}
      className={
        active
          ? "relative min-h-[100dvh] overflow-hidden bg-slate-950"
          : "bg-slate-50"
      }
    >
      <div
        ref={overlayHostRef}
        data-teach-overlay-root
        className="pointer-events-none fixed inset-0 z-[230]"
      />

      {!active ? (
        <main className="p-4 sm:p-6">
          <section className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Classroom workspace
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950">
              Ready to teach{subjectLabel ? " " + subjectLabel : ""}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Open the authorized Smart Book reader in fullscreen Teaching Mode.
              Press Esc or use Exit Teaching Mode whenever you are done.
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={enterTeachingMode}
                className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800"
              >
                Enter Teaching Mode
              </button>
            </div>
          </section>
        </main>
      ) : (
        <TeachModeClassroomContext.Provider value={{ currentPage, setCurrentPage }}>
          <V2OverlayPortalProvider target={overlayHost}>
          {children}

          <button
            type="button"
            onClick={exitTeachingMode}
            className="fixed bottom-3 right-3 z-[220] rounded-xl border border-white/20 bg-slate-950/85 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-slate-900"
            aria-label="Exit Teaching Mode"
          >
            Exit Teaching Mode
          </button>
          </V2OverlayPortalProvider>
        </TeachModeClassroomContext.Provider>
      )}
    </div>
  );
}
