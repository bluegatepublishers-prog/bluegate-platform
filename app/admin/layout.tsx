import type { ReactNode } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import { getPublisherBranding } from "@/lib/publisher-context";
import { getPublisherFeatures } from "@/lib/publisher-features";
import { PublisherAdminProvider } from "@/components/admin/PublisherAdminContext";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, publisher } = await requirePublisherAdmin();
  const [branding,features]=await Promise.all([getPublisherBranding(publisher.id),getPublisherFeatures(publisher.id)]);
  const userLabel = user.name?.trim() || "Administrator";

  return <PublisherAdminProvider publisherId={publisher.id}><AdminShell userLabel={userLabel} branding={branding} features={features}>{children}</AdminShell></PublisherAdminProvider>;
}
