"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { BookNarrationManifest, NarrationSegment } from "@/lib/content-narration";

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
type PlaybackStatus = "IDLE" | "PLAYING" | "PAUSED" | "UNAVAILABLE";

export default function V2ReadAloudPlayer({
  manifest,
  audioUrls = {},
  onActiveSegmentChange,
  requestedSegment,
}: {
  manifest: BookNarrationManifest;
  audioUrls?: Record<string, string>;
  onActiveSegmentChange?: (segmentId: string | null) => void;
  requestedSegment?: { segmentId: string; token: number } | null;
}) {
  const segments = useMemo(() => manifest.segments, [manifest]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [status, setStatus] = useState<PlaybackStatus>("IDLE");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const segment = segments[segmentIndex];
  const page = segment ? manifest.pages.find((entry) => entry.pageId === segment.pageId) : undefined;
  const pageStartIndex = page ? segments.findIndex((entry) => entry.pageId === page.pageId) : 0;
  const audioUrl = segment ? resolveAudioUrl(segment, page?.audioResourceId, page?.segments.length === 1, audioUrls) : undefined;

  useEffect(() => {
    onActiveSegmentChange?.(segment?.id ?? null);
  }, [segment, onActiveSegmentChange]);

  const requestedSegmentId = requestedSegment?.segmentId;
  const requestedSegmentToken = requestedSegment?.token;
  useEffect(() => {
    if (!requestedSegmentId) return;
    const timer = window.setTimeout(() => {
      const requestedIndex = segments.findIndex((entry) => entry.id === requestedSegmentId);
      if (requestedIndex < 0) return;
      setSegmentIndex(requestedIndex);
      setStatus("IDLE");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestedSegmentId, requestedSegmentToken, segments]);


  useEffect(() => () => stopPlayback(audioRef, utteranceRef), []);

  const speak = (target: NarrationSegment) => {
    const speech = globalThis.speechSynthesis;
    if (!speech || typeof globalThis.SpeechSynthesisUtterance === "undefined") {
      setStatus("UNAVAILABLE");
      return;
    }
    stopPlayback(audioRef, utteranceRef);
    const utterance = new SpeechSynthesisUtterance(target.text);
    utterance.lang = target.language;
    utterance.rate = speed;
    utterance.onend = () => advance(target.id);
    utterance.onerror = () => setStatus("UNAVAILABLE");
    utteranceRef.current = utterance;
    speech.speak(utterance);
    setStatus("PLAYING");
  };

  const play = () => {
    if (!segment) {
      setStatus("UNAVAILABLE");
      return;
    }
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.preload = "metadata";
      audio.playbackRate = speed;
      audio.onended = () => advance(segment.id);
      audio.onerror = () => {
        audioRef.current = null;
        speak(segment);
      };
      void audio.play().then(() => setStatus("PLAYING")).catch(() => speak(segment));
      return;
    }
    speak(segment);
  };

  const pause = () => {
    audioRef.current?.pause();
    globalThis.speechSynthesis?.pause();
    setStatus("PAUSED");
  };

  const restart = () => {
    const nextIndex = pageStartIndex >= 0 ? pageStartIndex : 0;
    setSegmentIndex(nextIndex);
    setStatus("IDLE");
    window.setTimeout(() => play(), 0);
  };

  const move = (direction: -1 | 1) => {
    if (!segments.length) return;
    const nextIndex = Math.max(0, Math.min(segments.length - 1, segmentIndex + direction));
    setSegmentIndex(nextIndex);
    if (status === "PLAYING") window.setTimeout(() => play(), 0);
    else setStatus("IDLE");
  };

  const advance = (currentId: string) => {
    const currentIndex = segments.findIndex((entry) => entry.id === currentId);
    if (currentIndex < 0 || currentIndex >= segments.length - 1) {
      setStatus("IDLE");
      return;
    }
    setSegmentIndex(currentIndex + 1);
    window.setTimeout(() => {
      const next = segments[currentIndex + 1];
      if (next) {
        const nextPage = manifest.pages.find((entry) => entry.pageId === next.pageId);
        const nextAudio = resolveAudioUrl(next, nextPage?.audioResourceId, nextPage?.segments.length === 1, audioUrls);
        if (nextAudio) {
          const audio = new Audio(nextAudio);
          audioRef.current = audio;
          audio.playbackRate = speed;
          audio.onended = () => advance(next.id);
          audio.onerror = () => speak(next);
          void audio.play().then(() => setStatus("PLAYING")).catch(() => speak(next));
        } else {
          speak(next);
        }
      }
    }, 0);
  };

  const changeSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const noText = segments.length === 0;
  return (
    <section aria-label="Read Aloud" className="rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-lg backdrop-blur" data-v2-read-aloud-player>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-slate-900">Read Aloud</span>
        <button type="button" onClick={status === "PLAYING" ? pause : play} disabled={noText} aria-label={status === "PLAYING" ? "Pause Read Aloud" : "Play Read Aloud"} aria-pressed={status === "PLAYING"} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          {status === "PLAYING" ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => move(-1)} disabled={noText || segmentIndex === 0} aria-label="Previous sentence" className="rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-40">Previous</button>
        <button type="button" onClick={() => move(1)} disabled={noText || segmentIndex >= segments.length - 1} aria-label="Next sentence" className="rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-40">Next</button>
        <button type="button" onClick={restart} disabled={noText} aria-label="Restart Read Aloud" className="rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-40">Restart</button>
        <label className="flex items-center gap-1 text-xs font-semibold text-slate-600">Speed
          <select value={speed} onChange={(event) => changeSpeed(Number(event.target.value))} aria-label="Read Aloud speed" className="rounded-lg border bg-white px-2 py-2">
            {SPEEDS.map((value) => <option key={value} value={value}>{value.toFixed(value === 1 ? 1 : 2)}×</option>)}
          </select>
        </label>
        <span className="ml-auto text-xs font-semibold text-slate-500">{noText ? "No readable text on this page." : (String(segmentIndex + 1) + " / " + String(segments.length))}</span>
      </div>
      {!noText ? <p className="mt-2 line-clamp-2 text-xs text-slate-600" aria-live="polite"><span className="font-semibold">{segment?.narrationLabel ? segment.narrationLabel + ": " : ""}</span>{segment?.text}</p> : null}
      {status === "UNAVAILABLE" && !noText ? <p className="mt-1 text-xs font-semibold text-amber-700">Read Aloud is unavailable in this browser.</p> : null}
    </section>
  );
}

function resolveAudioUrl(segment: NarrationSegment, pageAudioResourceId: string | undefined, pageHasOneSegment: boolean, audioUrls: Record<string, string>) {
  const resourceId = segment.audioResourceId || (pageHasOneSegment ? pageAudioResourceId : undefined);
  return resourceId ? audioUrls[resourceId] : undefined;
}

function stopPlayback(audioRef: { current: HTMLAudioElement | null }, utteranceRef: { current: SpeechSynthesisUtterance | null }) {
  audioRef.current?.pause();
  audioRef.current = null;
  globalThis.speechSynthesis?.cancel();
  if (utteranceRef.current) utteranceRef.current.onend = null;
  utteranceRef.current = null;
}