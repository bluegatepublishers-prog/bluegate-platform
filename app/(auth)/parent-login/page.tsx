import type { Metadata } from "next";

import { LoginForm } from "@/components/auth";

export const metadata: Metadata = {
	title: "Parent Login | Bluegate Publishers",
	description: "Sign in to view approved child learning progress.",
};

export default async function ParentLoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
	const { callbackUrl, error } = await searchParams;

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
			<div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white shadow-xl">
				<LoginForm
					callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
					redirectPath="/parent-dashboard"
					title="Bluegate Parent Portal"
					description="Use the account activated from your school invitation."
					identifierLabel="Email or Mobile Number"
					identifierPlaceholder="parent@example.com or 9876543210"
					identifierInputMode="text"
					showDemo={false}
					showPublicLink
					showActivateLink
					activateHref="/parent-activate"
					activateLabel="Activate Parent Account"
					initialError={typeof error === "string" ? "Your parent access could not be verified. Please sign in again or contact the school." : undefined}
				/>
			</div>
		</main>
	);
}
