export interface SelectedResourceLinks {
  classId: string | null;
  subjectId: string | null;
  seriesId: string | null;
  bookId: string | null;
  classLevel: string;
  subject: string;
}

export interface ResourceClassRecord {
  id: string;
  name: string;
}

export interface ResourceSubjectRecord {
  id: string;
  name: string;
}

export interface ResourceSeriesRecord {
  id: string;
}

export interface ResourceBookRecord {
  id: string;
  classId: string;
  subjectId: string;
  seriesId: string | null;
  class: { id: string; name: string };
  subject: { id: string; name: string };
}

export interface ResolvedResourceLinks {
  classId: string | null;
  subjectId: string | null;
  seriesId: string | null;
  bookId: string | null;
  classLevel: string;
  subject: string;
}

export function trimToNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function resolveResourceLinks(input: {
  selected: SelectedResourceLinks;
  classRecord: ResourceClassRecord | null;
  subjectRecord: ResourceSubjectRecord | null;
  seriesRecord: ResourceSeriesRecord | null;
  bookRecord: ResourceBookRecord | null;
}) {
  const { selected, classRecord, subjectRecord, seriesRecord, bookRecord } = input;

  if (selected.classId && !classRecord) {
    return { ok: false as const, message: "Select a valid class." };
  }
  if (selected.subjectId && !subjectRecord) {
    return { ok: false as const, message: "Select a valid subject." };
  }
  if (selected.seriesId && !seriesRecord) {
    return { ok: false as const, message: "Select a valid series." };
  }
  if (selected.bookId && !bookRecord) {
    return { ok: false as const, message: "Select a valid book." };
  }

  if (bookRecord) {
    return {
      ok: true as const,
      data: {
        classId: bookRecord.classId,
        subjectId: bookRecord.subjectId,
        seriesId: bookRecord.seriesId,
        bookId: bookRecord.id,
        classLevel: bookRecord.class.name,
        subject: bookRecord.subject.name,
      } satisfies ResolvedResourceLinks,
    };
  }

  const classLevel =
    classRecord?.name ?? (selected.classLevel.trim() || "All Classes");
  const subject =
    subjectRecord?.name ?? (selected.subject.trim() || "General");

  return {
    ok: true as const,
    data: {
      classId: selected.classId,
      subjectId: selected.subjectId,
      seriesId: selected.seriesId,
      bookId: null,
      classLevel,
      subject,
    } satisfies ResolvedResourceLinks,
  };
}
