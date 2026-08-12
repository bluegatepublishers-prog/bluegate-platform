"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { BookNarrationManifest, NarrationSegment } from "@/lib/content-narration";

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
type PlaybackStatus = "IDLE" | "PLAYING" | "PAUSED" | "UNAVAILABLE";

export type V2BrowserVoiceOption = {
  voiceURI: string;
  label: string;
  lang: string;
  category: "Indian English" | "British English" | "American English" | "Hindi" | "Other";
};

export type V2AuthoringVoiceOption = {
  voiceURI: string;
  label: string;
  lang: string;
  category: "Indian English" | "British English" | "American English" | "English" | "Hindi" | "Other";
};

export function getV2AuthoringVoiceOptions(voices: SpeechSynthesisVoice[]): V2AuthoringVoiceOption[] {
  return voices.map((voice) => {
    const lang = voice.lang.toLowerCase();
    const category: V2AuthoringVoiceOption["category"] = lang.startsWith("en-in")
      ? "Indian English"
      : lang.startsWith("en-gb")
        ? "British English"
        : lang.startsWith("en-us")
          ? "American English"
          : lang.startsWith("en")
            ? "English"
            : lang.startsWith("hi")
              ? "Hindi"
              : "Other";
    return { voiceURI: voice.voiceURI, label: voice.name, lang: voice.lang, category };
  }).filter((voice) => voice.category !== "Other");
}
export function getV2BrowserVoiceOptions(voices: SpeechSynthesisVoice[]): V2BrowserVoiceOption[] {
  return voices.map((voice) => {
    const lang = voice.lang.toLowerCase();
    const category: V2BrowserVoiceOption["category"] = lang.startsWith("en-in") ? "Indian English" : lang.startsWith("en-gb") ? "British English" : lang.startsWith("en-us") ? "American English" : lang.startsWith("hi") ? "Hindi" : "Other";
    return { voiceURI: voice.voiceURI, label: voice.name, lang: voice.lang, category };
  }).filter((voice) => voice.category !== "Other");
}

export default function V2ReadAloudPlayer({
  manifest,
  audioUrls = {},
  onActiveSegmentChange,
  requestedSegment,
  pageContext,
  pageText,
  onPrepare,
}: {
  manifest: BookNarrationManifest;
  audioUrls?: Record<string, string>;
  onActiveSegmentChange?: (segmentId: string | null) => void;
  requestedSegment?: { segmentId: string; token: number } | null;
  pageContext?: string;
  pageText?: string;
  onPrepare?: () => Promise<{ updatedPageCount: number; matchedPageCount: number }>;
}) {
  const segments = useMemo(() => manifest.segments, [manifest]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [status, setStatus] = useState<PlaybackStatus>("IDLE");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const segment = segments[segmentIndex];
  const page = segment ? manifest.pages.find((entry) => entry.pageId === segment.pageId) : undefined;
  const pageStartIndex = page ? segments.findIndex((entry) => entry.pageId === page.pageId) : 0;
  const audioUrl = segment ? resolveAudioUrl(segment, page?.audioResourceId, page?.segments.length === 1, audioUrls) : undefined;
  const authoringVoiceOptions = useMemo(() => getV2AuthoringVoiceOptions(voices), [voices]);
  const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI);
  const hasIndianEnglishVoice = authoringVoiceOptions.some((voice) => voice.category === "Indian English");
  const hasHindiVoice = authoringVoiceOptions.some((voice) => voice.category === "Hindi");

  useEffect(() => {
    const speech = globalThis.speechSynthesis;
    if (!speech) return;
    const syncVoices = () => setVoices(speech.getVoices());
    syncVoices();
    speech.addEventListener?.("voiceschanged", syncVoices);
    const previousOnVoicesChanged = speech.onvoiceschanged;
    speech.onvoiceschanged = syncVoices;
    return () => {
      speech.removeEventListener?.("voiceschanged", syncVoices);
      if (speech.onvoiceschanged === syncVoices) speech.onvoiceschanged = previousOnVoicesChanged;
    };
  }, []);

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

  const speakPageText = (text: string) => {
    const speech = globalThis.speechSynthesis;
    if (!speech || typeof globalThis.SpeechSynthesisUtterance === "undefined") {
      setStatus("UNAVAILABLE");
      return;
    }
    stopPlayback(audioRef, utteranceRef);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedVoice?.lang || "en";
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = speed;
    utterance.onend = () => setStatus("IDLE");
    utterance.onerror = () => setStatus("UNAVAILABLE");
    utteranceRef.current = utterance;
    speech.speak(utterance);
    setStatus("PLAYING");
  };
  const speak = (target: NarrationSegment) => {
    const speech = globalThis.speechSynthesis;
    if (!speech || typeof globalThis.SpeechSynthesisUtterance === "undefined") {
      setStatus("UNAVAILABLE");
      return;
    }
    stopPlayback(audioRef, utteranceRef);
    const utterance = new SpeechSynthesisUtterance(target.text);
    utterance.lang = selectedVoice?.lang || target.language;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = speed;
    utterance.onend = () => advance(target.id);
    utterance.onerror = () => setStatus("UNAVAILABLE");
    utteranceRef.current = utterance;
    speech.speak(utterance);
    setStatus("PLAYING");
  };

   const play = () => {
    if (pageText !== undefined) {
      if (pageText.trim()) speakPageText(pageText);
      else setStatus("IDLE");
      return;
    }
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

  const resume = () => {
    if (audioRef.current) {
      void audioRef.current.play().then(() => setStatus("PLAYING")).catch(() => setStatus("UNAVAILABLE"));
      return;
    }
    globalThis.speechSynthesis?.resume();
    setStatus("PLAYING");
  };

  const stop = () => {
    stopPlayback(audioRef, utteranceRef);
    setStatus("IDLE");
  };

   const restart = () => {
    if (pageText !== undefined) {
      stopPlayback(audioRef, utteranceRef);
      setStatus("IDLE");
      window.setTimeout(() => play(), 0);
      return;
    }
    const nextIndex = pageStartIndex >= 0 ? pageStartIndex : 0;
    setSegmentIndex(nextIndex);
    setStatus("IDLE");
    window.setTimeout(() => play(), 0);
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

  const move = (direction: -1 | 1) => {
    if (!segments.length) return;
    const nextIndex = Math.max(0, Math.min(segments.length - 1, segmentIndex + direction));
    setSegmentIndex(nextIndex);
    if (status === "PLAYING") window.setTimeout(() => play(), 0);
    else setStatus("IDLE");
  };
  const changeSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const [preparing, setPreparing] = useState(false);
  const [prepareMessage, setPrepareMessage] = useState("");
  const prepare = async () => {
    if (!onPrepare || preparing) return;
    setPreparing(true);
    setPrepareMessage("");
    try {
      const result = await onPrepare();
      setPrepareMessage(`Prepared ${result.updatedPageCount} page${result.updatedPageCount === 1 ? "" : "s"}. Refreshing book content...`);
    } catch {
      setPrepareMessage("Read Aloud could not be prepared. Check the book PDF and try again.");
    } finally {
      setPreparing(false);
    }
  };
  const pageTextProvided = pageText !== undefined;
  const currentPageText = pageText ?? "";
  const noText = pageTextProvided ? !currentPageText.trim() : segments.length === 0;
  const wordCount = currentPageText.trim() ? currentPageText.trim().split(/\s+/u).length : 0;
  const groupedVoiceCategories = ["Indian English", "British English", "American English", "English", "Hindi"] as const;
  return (
    <section aria-label="Read Aloud" className="rounded-xl border border-blue-200 bg-white/95 p-2 shadow-lg backdrop-blur" data-v2-read-aloud-player>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 font-bold text-slate-900">Read Aloud</span>
        <label className="flex items-center gap-1 font-semibold text-slate-600">Voice
          <select aria-label="Read Aloud voice" value={voiceURI} onChange={(event) => setVoiceURI(event.target.value)} className="max-w-56 rounded border bg-white px-1.5 py-1">
            <option value="">Device default</option>
            {groupedVoiceCategories.map((category) => {
              const categoryVoices = authoringVoiceOptions.filter((voice) => voice.category === category);
              return <optgroup key={category} label={category}>{categoryVoices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.label} ({voice.lang})</option>)}{category === "Hindi" && !hasHindiVoice ? <option disabled>Hindi voice unavailable on this device.</option> : null}</optgroup>;
            })}
          </select>
        </label>
        <button type="button" onClick={play} disabled={noText} aria-label="Play Read Aloud" className="rounded bg-blue-600 px-2.5 py-1 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Play</button>
        {!pageTextProvided ? <><button type="button" onClick={() => move(-1)} disabled={noText || segmentIndex === 0} aria-label="Previous sentence" className="rounded border px-2 py-1 font-semibold disabled:opacity-40">Previous</button>
        <button type="button" onClick={() => move(1)} disabled={noText || segmentIndex >= segments.length - 1} aria-label="Next sentence" className="rounded border px-2 py-1 font-semibold disabled:opacity-40">Next</button></> : null}
        <button type="button" onClick={status === "PAUSED" ? resume : pause} disabled={status === "IDLE" || status === "UNAVAILABLE"} aria-label={status === "PAUSED" ? "Resume Read Aloud" : "Pause Read Aloud"} className="rounded border px-2 py-1 font-semibold disabled:opacity-40">{status === "PAUSED" ? "Resume" : "Pause"}</button>
        <button type="button" onClick={stop} disabled={status === "IDLE" || status === "UNAVAILABLE"} aria-label="Stop Read Aloud" className="rounded border px-2 py-1 font-semibold disabled:opacity-40">Stop</button>
        <button type="button" onClick={restart} disabled={noText} aria-label="Restart Read Aloud" className="rounded border px-2 py-1 font-semibold disabled:opacity-40">Restart</button>
        <label className="flex items-center gap-1 font-semibold text-slate-600">Speed
          <select value={speed} onChange={(event) => changeSpeed(Number(event.target.value))} aria-label="Read Aloud speed" className="rounded border bg-white px-1.5 py-1">
            {SPEEDS.map((value) => <option key={value} value={value}>{value}x</option>)}
          </select>
        </label>
        <span className="ml-auto font-semibold text-slate-500">{pageContext ?? (noText ? "No readable text on this page." : `${segmentIndex + 1} / ${segments.length}`)}</span>
      </div>
      {pageTextProvided && !noText ? <p className="mt-1 text-[11px] text-slate-600" aria-live="polite">Reading text ready · ${wordCount} words</p> : !pageTextProvided && !noText ? <p className="mt-1 line-clamp-1 text-[11px] text-slate-600" aria-live="polite"><span className="font-semibold">{segment?.narrationLabel ? segment.narrationLabel + ": " : ""}</span>{segment?.text}</p> : null}
      {pageTextProvided && noText ? <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600"><span>Reading text has not been prepared for this book/page.</span>{onPrepare ? <button type="button" onClick={() => void prepare()} disabled={preparing} className="rounded border border-blue-300 bg-white px-2 py-1 font-semibold text-blue-900 disabled:opacity-40">{preparing ? "Preparing..." : "Prepare Read Aloud"}</button> : null}</div> : null}
      {prepareMessage ? <p role="status" className="mt-1 text-[11px] text-slate-600">{prepareMessage}</p> : null}      {!hasIndianEnglishVoice ? <p data-v2-indian-voice-fallback className="mt-1 text-[11px] text-slate-500">Indian English voice not available on this device.</p> : null}
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
