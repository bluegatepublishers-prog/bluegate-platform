import MasterDataManager from "@/components/admin/MasterDataManager";
import { listBoards } from "@/lib/master-data";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export default async function BoardsPage() {
  const actor = await requireLivePublisherAdmin();
  return <MasterDataManager title="Boards" singular="Board" apiBase="/api/admin/master/boards" initialRows={await listBoards(actor.publisherId)}/>;
}
