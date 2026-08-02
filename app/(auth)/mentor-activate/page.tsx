import type { Metadata } from "next";
import MentorActivationForm from "@/components/onboarding/MentorActivationForm";

export const metadata: Metadata = { title: "Activate Mentor Account | Bluegate" };

export default async function MentorActivatePage({ searchParams }: { searchParams: Promise<{ reference?: string; token?: string }> }) {
  const { reference = "", token = "" } = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl"><p className="font-bold text-blue-700">Bluegate Mentor Portal</p><h1 className="mt-2 text-3xl font-bold">Activate your account</h1><p className="mt-4 leading-7 text-slate-600">Create your private password. Your school cannot view it.</p>{reference&&token?<MentorActivationForm reference={reference} token={token}/>:<p role="alert" className="mt-8 rounded-2xl bg-rose-50 p-5 text-rose-800">This activation link is incomplete. Ask your school to send a new invitation.</p>}</section></main>;
}
