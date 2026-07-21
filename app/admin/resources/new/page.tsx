import ResourceForm from "@/components/admin/ResourceForm";
import { requireLivePublisherAdmin } from "@/lib/publisher-admin-authorization";
import { getResourceFormOptions } from "@/lib/resource-form-data";
export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
	const actor = await requireLivePublisherAdmin();
	const options = await getResourceFormOptions(actor.publisherId);

	return (
		<div className="mx-auto max-w-4xl space-y-7">
			<div>
				<h1 className="text-3xl font-bold">Add Resource</h1>
				<p className="mt-2 text-slate-600">Upload and publish teaching material.</p>
			</div>

			<ResourceForm options={options} />
		</div>
	);
}
