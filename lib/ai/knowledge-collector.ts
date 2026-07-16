import{prisma}from"@/lib/prisma";import type{KnowledgePackage}from"./types";
export async function collectBookKnowledge(bookId:string,requestedNames:string[]=[]):Promise<KnowledgePackage>{const book=await prisma.book.findFirst({where:{id:bookId,published:true},select:{id:true,title:true,class:{select:{name:true}},subject:{select:{name:true}},series:{select:{name:true}},chapters:{where:{approved:true,OR:[{reviewedText:{not:null}},{extractedText:{not:null}}]},orderBy:[{sortOrder:"asc"},{chapterNumber:"asc"}],include:{learningOutcomes:{orderBy:{sortOrder:"asc"}},questions:{where:{approved:true}},activities:{where:{approved:true}}}}}});if(!book)throw new Error("Published book knowledge was not found.");const requested=new Set(requestedNames.map(normalize).filter(Boolean));const candidates=book.chapters.filter(c=>requested.size===0||requested.has(normalize(c.title))||requested.has(String(c.chapterNumber)));const selected=candidates.length?candidates:book.chapters;return{book:{id:book.id,title:book.title,className:book.class.name,subjectName:book.subject.name,seriesName:book.series?.name??null},chapters:selected.map(c=>({id:c.id,chapterNumber:c.chapterNumber,title:c.title,sourceText:(c.reviewedText?.trim()||c.extractedText?.trim()||""),summary:c.summary,keywords:c.keywords,outcomes:c.learningOutcomes.map(o=>({outcome:o.outcome,bloomLevel:o.bloomLevel,competency:o.competency})),questions:c.questions.map(q=>({questionType:q.questionType,questionText:q.questionText,options:q.options,correctAnswer:q.correctAnswer,explanation:q.explanation,marks:q.marks,difficulty:q.difficulty,bloomLevel:q.bloomLevel,competency:q.competency})),activities:c.activities.map(a=>({title:a.title,objective:a.objective,instructions:a.instructions,expectedLearning:a.expectedLearning,assessment:a.assessment}))})),collectedAt:new Date().toISOString(),policy:"APPROVED_ONLY"}}
const normalize=(v:string)=>v.trim().toLowerCase().replace(/^chapter\s*/,'').replace(/[^a-z0-9]+/g,' ');

export async function collectApprovedStructuredChapter(bookId: string, chapterId: string) {
  return prisma.bookChapter.findFirst({
    where: { id: chapterId, bookId, approved: true, book: { published: true } },
    select: {
      id: true,
      chapterNumber: true,
      title: true,
      summary: true,
      keywords: true,
      learningOutcomes: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, outcome: true, bloomLevel: true, competency: true },
      },
      questions: {
        where: { approved: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, questionText: true, correctAnswer: true, explanation: true },
      },
      activities: {
        where: { approved: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, objective: true, instructions: true, expectedLearning: true },
      },
    },
  });
}

export async function collectStudentChapterKnowledge(
  bookId: string,
  chapterId: string,
): Promise<import("./types").StudentChapterKnowledge | null> {
  const book = await prisma.book.findFirst({
    where: { id: bookId, published: true },
    select: {
      title: true,
      class: { select: { name: true } },
      subject: { select: { name: true } },
      chapters: {
        where: {
          id: chapterId,
          bookId,
          approved: true,
          OR: [{ reviewedText: { not: null } }, { extractedText: { not: null } }],
        },
        take: 1,
        select: {
          chapterNumber: true,
          title: true,
          reviewedText: true,
          extractedText: true,
          summary: true,
          keywords: true,
          learningOutcomes: {
            orderBy: { sortOrder: "asc" },
            select: { outcome: true },
          },
          questions: {
            where: { approved: true },
            orderBy: { createdAt: "asc" },
            select: { questionText: true },
          },
          activities: {
            where: { approved: true },
            orderBy: { createdAt: "asc" },
            select: {
              title: true,
              objective: true,
              instructions: true,
              expectedLearning: true,
            },
          },
        },
      },
    },
  });
  const chapter = book?.chapters[0];
  const sourceText = chapter?.reviewedText?.trim() || chapter?.extractedText?.trim() || "";
  if (!book || !chapter || !sourceText || chapter.learningOutcomes.length === 0) return null;
  return {
    book: {
      title: book.title,
      className: book.class.name,
      subjectName: book.subject.name,
    },
    chapter: {
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      sourceText: sourceText.slice(0, 24_000),
      summary: chapter.summary?.trim().slice(0, 4_000) || null,
      keywords: [...new Set(chapter.keywords.map((item) => item.trim()).filter(Boolean))].slice(0, 100),
      outcomes: chapter.learningOutcomes.map((item) => item.outcome.trim()).filter(Boolean).slice(0, 100),
      questions: chapter.questions.map((item) => item.questionText.trim()).filter(Boolean).slice(0, 20),
      activities: chapter.activities.slice(0, 20),
    },
    policy: "APPROVED_CHAPTER_ONLY",
  };
}
