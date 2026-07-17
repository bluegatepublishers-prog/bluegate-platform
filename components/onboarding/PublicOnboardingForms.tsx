"use client";

import { useActionState } from "react";
import { parentActivationAction, schoolSignupAction, studentActivationAction, teacherSignupAction } from "@/app/onboarding-actions";
import { INITIAL_ONBOARDING_STATE } from "@/lib/onboarding-policy";

const input = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const label = "text-sm font-semibold text-slate-700";
const fields = (items: Array<{ name: string; title: string; type?: string; autoComplete?: string; required?: boolean }>) => items.map((item) => <label key={item.name} className={label}>{item.title}<input className={input} name={item.name} type={item.type ?? "text"} autoComplete={item.autoComplete} required={item.required ?? true}/></label>);

function Status({ state }: { state: typeof INITIAL_ONBOARDING_STATE }) { return state.message ? <div role="status" aria-live="polite" className={`rounded-xl p-4 text-sm font-semibold ${state.ok ? "bg-green-50 text-green-800" : "bg-rose-50 text-rose-800"}`}><p>{state.message}</p>{state.verificationReady?<a className="mt-3 inline-block underline" href="/verify-email">Open email verification</a>:null}</div> : null; }
function Submit({ pending, children }: { pending: boolean; children: string }) { return <button disabled={pending} className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">{pending ? "Please wait…" : children}</button>; }

export function SchoolSignupForm() {
  const [state, action, pending] = useActionState(schoolSignupAction, INITIAL_ONBOARDING_STATE);
  return <form action={action} className="grid gap-5 md:grid-cols-2">{fields([{name:"schoolName",title:"School Name"},{name:"principalName",title:"Principal Name"},{name:"email",title:"Email",type:"email",autoComplete:"email"},{name:"phone",title:"Phone",type:"tel",autoComplete:"tel"},{name:"address",title:"Address",autoComplete:"street-address"},{name:"city",title:"City",autoComplete:"address-level2"},{name:"state",title:"State",autoComplete:"address-level1"},{name:"pincode",title:"Pincode",autoComplete:"postal-code"},{name:"password",title:"Password",type:"password",autoComplete:"new-password"},{name:"confirmPassword",title:"Confirm Password",type:"password",autoComplete:"new-password"}])}<div className="md:col-span-2"><Status state={state}/></div><Submit pending={pending}>Submit school request</Submit></form>;
}

export function TeacherSignupForm({ schools }: { schools: Array<{ id: string; schoolName: string; city: string; state: string }> }) {
  const [state, action, pending] = useActionState(teacherSignupAction, INITIAL_ONBOARDING_STATE);
  return <form action={action} className="grid gap-5 md:grid-cols-2">{fields([{name:"name",title:"Name",autoComplete:"name"},{name:"email",title:"Email",type:"email",autoComplete:"email"},{name:"phone",title:"Phone",type:"tel",autoComplete:"tel"}])}<label className={label}>School Search<select name="schoolId" required className={input}><option value="">Select an approved school</option>{schools.map((school)=><option key={school.id} value={school.id}>{school.schoolName} — {school.city}, {school.state}</option>)}</select></label>{fields([{name:"designation",title:"Designation"},{name:"subject",title:"Subject"},{name:"classes",title:"Classes"},{name:"password",title:"Password",type:"password",autoComplete:"new-password"},{name:"confirmPassword",title:"Confirm Password",type:"password",autoComplete:"new-password"}])}<div className="md:col-span-2"><Status state={state}/></div><Submit pending={pending}>Submit teacher request</Submit></form>;
}

export function StudentActivationForm() {
  const [state, action, pending] = useActionState(studentActivationAction, INITIAL_ONBOARDING_STATE);
  return <form action={action} className="grid gap-5 md:grid-cols-2">{fields([{name:"activationCode",title:"Activation Code",autoComplete:"one-time-code"},{name:"admissionNumber",title:"Admission Number"},{name:"email",title:"Email held by your school",type:"email",autoComplete:"email"}])}<label className={label}>Date of Birth (if recorded by your school)<input className={input} name="dateOfBirth" type="date"/></label>{fields([{name:"password",title:"Password",type:"password",autoComplete:"new-password"},{name:"confirmPassword",title:"Confirm Password",type:"password",autoComplete:"new-password"}])}<div className="md:col-span-2"><Status state={state}/></div><Submit pending={pending}>Continue student activation</Submit></form>;
}

export function ParentActivationForm() {
  const [state, action, pending] = useActionState(parentActivationAction, INITIAL_ONBOARDING_STATE);
  return <form action={action} className="grid gap-5 md:grid-cols-2">{fields([{name:"invitationCode",title:"Invitation Code",autoComplete:"one-time-code"},{name:"name",title:"Parent / Guardian Name",autoComplete:"name"},{name:"email",title:"Invited Email",type:"email",autoComplete:"email"},{name:"phone",title:"Phone (optional)",type:"tel",autoComplete:"tel",required:false},{name:"password",title:"Password",type:"password",autoComplete:"new-password"},{name:"confirmPassword",title:"Confirm Password",type:"password",autoComplete:"new-password"}])}<div className="md:col-span-2"><Status state={state}/></div><Submit pending={pending}>Activate parent account</Submit></form>;
}
