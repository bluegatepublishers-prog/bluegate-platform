export function contentResourcePreviewUrl(resourceId: string) {
  return `/api/admin/resources/${encodeURIComponent(resourceId)}/preview`;
}
