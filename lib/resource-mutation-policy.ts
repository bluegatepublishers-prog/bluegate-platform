export interface TeacherResourceMutationAccess {
  teacher: { id: string };
  resource: { id: string; fileUrl: string };
}

export interface ResourceMutationDependencies<TBookmark = unknown> {
  authorizeTeacherResource(
    userId: string,
    resourceId: string,
  ): Promise<TeacherResourceMutationAccess | null>;
  findBookmark(teacherId: string, resourceId: string): Promise<TBookmark | null>;
  createBookmark(teacherId: string, resourceId: string): Promise<TBookmark>;
  deleteBookmarks(teacherId: string, resourceId: string): Promise<number>;
  recordDownload(teacherId: string, resourceId: string): Promise<void>;
}

export async function authorizeAndRecordResourceDownload<TBookmark>(
  userId: string,
  resourceId: string,
  dependencies: ResourceMutationDependencies<TBookmark>,
) {
  const access = await dependencies.authorizeTeacherResource(userId, resourceId);
  if (!access) return null;
  await dependencies.recordDownload(access.teacher.id, access.resource.id);
  return { url: access.resource.fileUrl };
}

export async function authorizeAndCreateResourceBookmark<TBookmark>(
  userId: string,
  resourceId: string,
  dependencies: ResourceMutationDependencies<TBookmark>,
) {
  const access = await dependencies.authorizeTeacherResource(userId, resourceId);
  if (!access) return null;
  const existing = await dependencies.findBookmark(access.teacher.id, resourceId);
  if (existing) return existing;
  return dependencies.createBookmark(access.teacher.id, resourceId);
}

export async function authorizeAndRemoveResourceBookmark<TBookmark>(
  userId: string,
  resourceId: string,
  dependencies: ResourceMutationDependencies<TBookmark>,
) {
  const access = await dependencies.authorizeTeacherResource(userId, resourceId);
  if (!access) return null;
  await dependencies.deleteBookmarks(access.teacher.id, resourceId);
  return { success: true as const };
}
