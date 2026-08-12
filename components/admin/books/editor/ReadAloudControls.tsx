"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const READ_ALOUD_SPEEDS = [0.75, 1, 1.25, 1.5] as const;

type SpeakOptions = { rate?: number };

type SpeechState = {
  speak: (text: string, options?: SpeakOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  speaking: boolean;
  paused: boolean;
  supported: boolean;
};

function hasSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
}

export function useReadAloud(contextKey = ""): SpeechState {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = hasSpeechSynthesis();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    if (utteranceRef.current) utteranceRef.current.onend = null;
    utteranceRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cancelSpeech();
    setSpeaking(false);
    setPaused(false);
  }, [cancelSpeech]);

  useEffect(() => () => cancelSpeech(), [contextKey, cancelSpeech]);

  const speak = useCallback((text: string, options: SpeakOptions = {}) => {
    if (!hasSpeechSynthesis() || !text.trim()) return;
    const speech = window.speechSynthesis;
    speech.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1;
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setSpeaking(false);
      setPaused(false);
    };
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setSpeaking(false);
      setPaused(false);
    };
    utteranceRef.current = utterance;
    speech.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (!hasSpeechSynthesis() || !speaking) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [speaking]);

  const resume = useCallback(() => {
    if (!hasSpeechSynthesis() || !speaking) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [speaking]);

  return { speak, pause, resume, stop, speaking, paused, supported };
}

type Props = {
  text?: string;
  contextKey: string;
  onPrepare?: () => Promise<{ updatedPageCount: number; matchedPageCount: number }>;
};

export default function ReadAloudControls({ text = "", contextKey, onPrepare }: Props) {
  const [speed, setSpeed] = useState<number>(1);
  const [prepareMessage, setPrepareMessage] = useState("");
  const [preparing, setPreparing] = useState(false);
  const speech = useReadAloud(contextKey);
  const hasText = Boolean(text.trim());

  const play = () => speech.speak(text, { rate: speed });
  const changeSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    if (speech.speaking && hasText) speech.speak(text, { rate: nextSpeed });
  };
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

  return (
    <section aria-label="Page Read Aloud" data-v2-page-read-aloud className="rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-blue-950">Read Aloud</span>
        <button type="button" onClick={play} disabled={!hasText || !speech.supported} className="rounded border border-blue-300 bg-white px-2 py-1 font-semibold text-blue-900 disabled:opacity-40">▶ Read Aloud</button>
        <button type="button" onClick={speech.paused ? speech.resume : speech.pause} disabled={!speech.speaking} className="rounded border border-blue-300 bg-white px-2 py-1 font-semibold text-blue-900 disabled:opacity-40">{speech.paused ? "Resume" : "Pause"}</button>
        <button type="button" onClick={speech.stop} disabled={!speech.speaking} className="rounded border border-blue-300 bg-white px-2 py-1 font-semibold text-blue-900 disabled:opacity-40">■ Stop</button>
        <label className="flex items-center gap-1 font-semibold text-blue-900">Speed
          <select aria-label="Read Aloud speed" value={speed} onChange={(event) => changeSpeed(Number(event.target.value))} className="rounded border border-blue-300 bg-white px-1 py-1">
            {READ_ALOUD_SPEEDS.map((value) => <option key={value} value={value}>{value}x</option>)}
          </select>
        </label>
      </div>
      {!hasText ? <div className="mt-2 flex flex-wrap items-center gap-2 text-slate-600"><span>Reading text has not been prepared for this page.</span>{onPrepare ? <button type="button" onClick={() => void prepare()} disabled={preparing} className="rounded border border-blue-300 bg-white px-2 py-1 font-semibold text-blue-900 disabled:opacity-40">{preparing ? "Preparing..." : "Prepare Read Aloud"}</button> : null}</div> : null}
      {!speech.supported ? <p className="mt-1 text-amber-800">Read Aloud is unavailable in this browser.</p> : null}
      {prepareMessage ? <p role="status" className="mt-1 text-slate-700">{prepareMessage}</p> : null}
    </section>
  );
}
