import MasterDataManager from "@/components/admin/MasterDataManager";
import { listDefinitions } from "@/lib/master-data";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";

export default async function CustomMasterDataPage() {
  const actor = await requireLivePublisherAdmin();
  return <MasterDataManager title="Custom Master Data" singular="Type" apiBase="/api/admin/master/custom" detailHrefBase="/admin/master/custom" reservedHint="Codes for core entities such as BOARD, CLASS, SUBJECT, and BOOK_SERIES are reserved." initialRows={await listDefinitions(actor.publisherId)}/>;
}
