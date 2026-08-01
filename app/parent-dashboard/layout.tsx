import type { ReactNode } from "react";

import ParentPortalShell from "@/components/parent/ParentPortalShell";
import { ParentAccessError, requireParent } from "@/lib/parent-dashboard";

export const dynamic = "force-dynamic";

export default async function ParentLayout({ children }: { children: ReactNode }) {
	let parent;
	try {
		parent = await requireParent();
	} catch (error) {
		if (error instanceof ParentAccessError) {
			return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-bold text-amber-950">Parent access unavailable</h1><p className="mt-3 text-amber-800">{error.message}</p></section></main>;
		}
		throw error;
	}

	return <ParentPortalShell parentName={parent.user.name}>{children}</ParentPortalShell>;
}
