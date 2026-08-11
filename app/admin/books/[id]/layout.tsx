import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";

export default async function BookAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requirePublisherAdminBookOwnership(id);

  return <>{children}</>;
}