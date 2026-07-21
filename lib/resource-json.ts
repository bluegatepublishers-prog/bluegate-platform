import type { Resource } from "@prisma/client";
import { toJsonSafeFileSize } from "@/lib/resource-helpers";

export function toResourceJson(resource: Resource) {
  return {
    ...resource,
    fileSizeBytes: toJsonSafeFileSize(resource.fileSizeBytes),
  };
}

export function toResourceJsonList(resources: Resource[]) {
  return resources.map(toResourceJson);
}
