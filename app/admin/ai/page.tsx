import { CheckCircle2, XCircle } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { getOpenAiReadiness } from "@/lib/ai/providers/openai-readiness";
import ProviderTestButton from "./ProviderTestButton";

export const dynamic = "force-dynamic"; export const revalidate = 0; export const metadata = { title: "AI Provider Diagnostic | Bluegate Admin" };

export default async function AdminAiPage() {
  await requireUser(["ADMIN"]);
  const readiness = getOpenAiReadiness();
  return <div className="mx-auto max-w-4xl space-y-7"><div><p className="text-sm font-bold uppercase tracking-wider text-blue-700">System diagnostic</p><h1 className="mt-2 text-3xl font-bold text-slate-900">AI provider readiness</h1><p className="mt-2 text-slate-600">Review safe server configuration and run a minimal OpenAI connectivity check.</p></div><section className="rounded-2xl border bg-white p-6 shadow-sm"><div className="grid gap-4 sm:grid-cols-2"><Status label="Active provider" value={readiness.activeProvider === "openai" ? "OpenAI" : "Fake"}/><Status label="API key configured" value={readiness.apiKeyConfigured ? "Yes" : "No"} ok={readiness.apiKeyConfigured}/><Status label="Model name" value={readiness.model}/><Status label="Timeout" value={`${readiness.timeoutMs.toLocaleString()} ms`} ok={readiness.timeoutSettingValid}/><Status label="Provider setting" value={readiness.providerSettingValid ? "Valid" : "Invalid"} ok={readiness.providerSettingValid}/><Status label="Provider readiness" value={readiness.ready ? "Ready" : "Not ready"} ok={readiness.ready}/></div></section><section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-900">Controlled live test</h2><p className="mt-2 mb-5 text-sm text-slate-600">Calls OpenAI with a fixed, minimal structured prompt. It does not use teacher quota or create generation records.</p><ProviderTestButton disabled={!readiness.ready}/></section></div>;
}
function Status({label,value,ok}:{label:string;value:string;ok?:boolean}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><div className="mt-2 flex items-center gap-2 font-semibold text-slate-900">{ok===true?<CheckCircle2 className="h-5 w-5 text-emerald-600"/>:ok===false?<XCircle className="h-5 w-5 text-red-500"/>:null}{value}</div></div>}
