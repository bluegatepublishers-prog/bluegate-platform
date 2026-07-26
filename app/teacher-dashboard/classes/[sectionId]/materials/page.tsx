import MaterialManager from "@/components/classroom/MaterialManager";
import { getTeacherClassMaterials } from "@/lib/classroom";

export default async function TeacherClassMaterialsPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const data = await getTeacherClassMaterials(sectionId);
  return (
    <MaterialManager
      sectionId={sectionId}
      subjects={data.scope.sectionSubjects.map((item) => ({
        id: item.id,
        subjectId: item.subjectId,
        name: item.subject.name,
        chapters: item.bookAdoptions.flatMap((adoption) => adoption.book.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, chapterNumber: chapter.chapterNumber }))),
        resources: item.resources.map((resource) => ({ id: resource.id, title: resource.title, type: resource.type })),
      }))}
      materials={data.materials.map((material) => ({
        id: material.id,
        title: material.title,
        description: material.description,
        kind: material.kind,
        source: material.source,
        status: material.status,
        scheduledAt: material.scheduledAt?.toISOString() ?? null,
        sectionSubjectId: material.sectionSubjectId,
        subjectId: material.subjectId,
        subjectName: material.subject.name,
        chapterId: material.chapterId,
        chapterName: material.chapter ? `Chapter ${material.chapter.chapterNumber}: ${material.chapter.title}` : null,
        aiGenerationId: material.aiGenerationId,
      }))}
      reusable={data.reusableMaterials.map((material) => ({ id: material.id, title: material.title, kind: material.kind, source: material.source }))}
      aiGenerations={data.aiGenerations.map((generation) => ({ id: generation.id, title: generation.title, tool: generation.tool, status: generation.status }))}
    />
  );
}
