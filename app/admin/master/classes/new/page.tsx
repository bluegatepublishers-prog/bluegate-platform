import { notFound } from "next/navigation";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export default async function NewClassPage() {
  await requireLivePublisherAdmin();
  notFound();
}
