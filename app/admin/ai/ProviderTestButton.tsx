"use client";

import { useState, useTransition } from "react";
import { Activity, LoaderCircle } from "lucide-react";
import { testOpenAiProvider, type ProviderTestResult } from "./actions";

export default function ProviderTestButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ProviderTestResult | null>(null);

  return <div className="space-y-4"><button type="button" disabled={disabled || pending} onClick={() => startTransition(async () => setResult(await testOpenAiProvider()))} className="inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{pending ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin"/> : <Activity className="mr-2 h-5 w-5"/>}{pending ? "Testing OpenAI…" : "Run OpenAI connectivity test"}</button>{result ? <div role="status" className={`rounded-xl border p-4 text-sm font-semibold ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}><p>{result.message}</p><p className="mt-1 text-xs font-medium opacity-75">Tested {new Date(result.testedAt).toLocaleString()}</p></div> : <p className="text-sm text-slate-500">Last provider test result: Not recorded</p>}</div>;
}
