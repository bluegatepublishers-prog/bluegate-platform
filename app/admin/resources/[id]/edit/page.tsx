import { notFound } from "next/navigation";
import ResourceForm from "@/components/admin/ResourceForm";
import { prisma } from "@/lib/prisma";
import { requirePublisherAdminResourceOwnership } from "@/lib/publisher-admin-data";
import { getResourceFormOptions } from "@/lib/resource-form-data";
export const dynamic = "force-dynamic";

export default async function EditResourcePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const actor = await requirePublisherAdminResourceOwnership(id);

	const [resourceRecord, options] = await Promise.all([
		prisma.resource.findFirst({
			where: { id, publisherId: actor.publisherId },
		}),
		getResourceFormOptions(actor.publisherId),
	]);

	if (!resourceRecord) notFound();

	const resource = {
		...resourceRecord,
		fileSizeBytes:
			resourceRecord.fileSizeBytes === null
				? null
				: resourceRecord.fileSizeBytes.toString(),
	};

	return (
		<div className="mx-auto max-w-4xl space-y-7">
			<div>
				<h1 className="text-3xl font-bold">Edit Resource</h1>
				<p className="mt-2 text-slate-600">Replace files or update publishing metadata.</p>
			</div>

			<ResourceForm resource={resource} options={options} />
		</div>
	);
}
