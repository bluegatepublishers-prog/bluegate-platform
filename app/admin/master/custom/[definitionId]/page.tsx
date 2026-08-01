import { notFound } from "next/navigation";
import MasterDataManager from "@/components/admin/MasterDataManager";
import { getDefinition, listValues } from "@/lib/master-data";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export default async function CustomMasterDataValuesPage({ params }: { params: Promise<{ definitionId: string }> }) {
  const actor = await requireLivePublisherAdmin(); const { definitionId } = await params;
  const definition = await getDefinition(actor.publisherId, definitionId); if (!definition) notFound();
  return <MasterDataManager title={definition.name} singular="Value" apiBase={`/api/admin/master/custom/${definitionId}/values`} initialRows={await listValues(actor.publisherId, definitionId)}/>;
}
