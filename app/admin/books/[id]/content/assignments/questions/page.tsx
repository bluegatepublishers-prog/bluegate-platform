import PublisherQuestionBank from "@/components/admin/books/PublisherQuestionBank";
import { loadPublisherQuestionBankOptions } from "@/lib/publisher-question-bank";
import { requirePublisherAdminBookOwnership } from "@/lib/publisher-admin-data";

export const dynamic = "force-dynamic";

export default async function PublisherQuestionBankPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePublisherAdminBookOwnership(id);
  const options = await loadPublisherQuestionBankOptions(actor.publisherId, id);
  return <PublisherQuestionBank options={options} />;
}
