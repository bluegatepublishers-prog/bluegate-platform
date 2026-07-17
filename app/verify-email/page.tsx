import { cookies } from "next/headers";
import Link from "next/link";

import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import { getEmailVerificationView } from "@/lib/account-security";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const reference = (await cookies()).get("bluegate_email_challenge")?.value;
  const view = await getEmailVerificationView(reference);
  return <main className="min-h-screen bg-slate-50 px-4 py-12"><section className="mx-auto max-w-lg rounded-3xl border bg-white p-7 shadow-sm sm:p-10"><p className="font-bold text-blue-700">Account security</p><h1 className="mt-2 text-3xl font-bold">Verify your email</h1><p className="mt-3 text-slate-600">Email verification confirms the address. School and Teacher approval remain separate requirements.</p><div className="mt-8">{view?.available?<EmailVerificationForm maskedEmail={view.maskedEmail} backPath={view.backPath}/>:<div className="space-y-5"><p className="rounded-2xl bg-amber-50 p-5 text-amber-900">This verification request is unavailable or complete. Start the signup or activation flow again.</p><Link className="inline-flex rounded-xl bg-blue-700 px-5 py-3 font-bold text-white" href="/portal">Return to portal</Link></div>}</div></section></main>;
}
