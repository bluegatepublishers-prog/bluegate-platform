import Image from "next/image";
import type {
  WizardBook,
  WizardTeachingContext,
} from "./types";

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500";

export default function BookSelector({
  classes,
  contexts,
  books,
  classId,
  contextId,
  bookId,
  search,
  onClass,
  onContext,
  onBook,
  onSearch,
}: {
  classes: {
    id: string;
    name: string;
  }[];
  contexts: WizardTeachingContext[];
  books: WizardBook[];
  classId: string;
  contextId: string;
  bookId: string;
  search: string;
  onClass: (value: string) => void;
  onContext: (value: string) => void;
  onBook: (value: string) => void;
  onSearch: (value: string) => void;
}) {
  const availableContexts = contexts.filter(
    (context) =>
      !classId || context.classId === classId,
  );

  const selectedContext =
    contexts.find(
      (context) => context.id === contextId,
    ) ?? null;

  const availableBooks = books.filter(
    (book) => {
      if (!selectedContext) return false;

      const allowed = book.contexts.some(
        (context) =>
          context.id === selectedContext.id,
      );

      if (!allowed) return false;

      if (!search.trim()) return true;

      const haystack = [
        book.title,
        book.series ?? "",
        selectedContext.className,
        selectedContext.sectionName,
        selectedContext.subjectName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(
        search.trim().toLowerCase(),
      );
    },
  );

  const selected = availableBooks.find(
    (book) => book.id === bookId,
  );

  const releasedChapters =
    selected?.chapters.filter(
      (chapter) => chapter.releaseReady,
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold">
          Class
          <select
            className={`${input} mt-2`}
            value={classId}
            onChange={(event) =>
              onClass(event.target.value)
            }
          >
            <option value="">
              Select class
            </option>

            {classes.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold">
          Section and subject
          <select
            className={`${input} mt-2`}
            value={contextId}
            disabled={!classId}
            onChange={(event) =>
              onContext(event.target.value)
            }
          >
            <option value="">
              Select teaching context
            </option>

            {availableContexts.map(
              (context) => (
                <option
                  key={context.id}
                  value={context.id}
                >
                  {context.sectionName} -{" "}
                  {context.subjectName}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="text-sm font-semibold">
          Search books
          <input
            className={`${input} mt-2`}
            value={search}
            disabled={!selectedContext}
            onChange={(event) =>
              onSearch(event.target.value)
            }
            placeholder="Book or series name"
          />
        </label>
      </div>

      {classId &&
        !availableContexts.length && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
            No active teaching context with a
            published Smart Book V2 release is
            available for this class.
          </div>
        )}

      {selectedContext && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Authorised teaching context
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {selectedContext.className} -{" "}
            {selectedContext.sectionName} -{" "}
            {selectedContext.subjectName}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Published Smart Book V2 release
            {" "}#{selectedContext.releaseVersionNumber}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {availableBooks.map((book) => (
          <button
            type="button"
            key={book.id}
            onClick={() =>
              onBook(book.id)
            }
            className={`rounded-2xl border p-4 text-left transition ${
              book.id === bookId
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                : "hover:border-slate-400"
            }`}
          >
            <p className="font-bold">
              {book.title}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {book.series ?? "Bluegate"}
              {" - "}
              {selectedContext?.className}
              {" - "}
              {selectedContext?.subjectName}
            </p>
          </button>
        ))}
      </div>

      {selected && selectedContext && (
        <div className="rounded-2xl bg-slate-50 p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-200">
              {selected.coverImage ? (
                <Image
                  src={selected.coverImage}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center p-3 text-center text-xs text-slate-500">
                  No cover
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Selected released book
              </p>

              <h3 className="mt-1 text-xl font-bold">
                {selected.title}
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Class: {selectedContext.className}
                <br />
                Section: {selectedContext.sectionName}
                <br />
                Subject: {selectedContext.subjectName}
                <br />
                Series:{" "}
                {selected.series ??
                  "Not specified"}
                <br />
                Publisher:{" "}
                {selected.publisher ??
                  "Bluegate"}
              </p>

              <p className="mt-3 text-sm text-slate-600">
                {selected.summary ??
                  "Published Smart Book V2 content is available for question-paper generation."}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Released chapters"
              value={String(
                releasedChapters.length,
              )}
            />

            <Stat
              label="Smart Book"
              value="V2 Ready"
            />

            <Stat
              label="Release"
              value={`#${selected.releaseVersionNumber}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}
