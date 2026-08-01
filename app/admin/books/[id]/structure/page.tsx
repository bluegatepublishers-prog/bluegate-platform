import { redirect } from "next/navigation";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";

export default async function LegacyStructureRedirect({ params }:{ params:Promise<{id:string}> }) {
  const { id }=await params;
  await requirePublisherAdminBookOwnership(id);
  redirect(`/admin/books/${id}/content`);
}
