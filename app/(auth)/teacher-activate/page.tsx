import type { Metadata } from "next";
import TeacherActivationForm from "@/components/onboarding/TeacherActivationForm";
export const metadata: Metadata = { title: "Activate Teacher Account | Bluegate" };
export default async function TeacherActivatePage({ searchParams }: { searchParams: Promise<{ reference?: string; token?: string }> }) {
  const { reference = "", token = "" } = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><section className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-blue-700">Bluegate Teacher Portal</p><h1 className="mt-1 text-xl font-semibold">Activate your account</h1><p className="mt-2 text-sm text-slate-600">Create your private password. Your school cannot view it.</p>{reference && token ? <TeacherActivationForm reference={reference} token={token}/> : <p role="alert" className="mt-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">This activation link is incomplete. Ask your school to send a new invitation.</p>}</section></main>;
}
