"use client";

import { useMemo, useState } from "react";

import SearchBar from "@/components/books/SearchBar";
import BookFilters from "@/components/books/BookFilters";
import BookGrid from "@/components/books/BookGrid";
import InspectionModal from "@/components/books/InspectionModal";

import { Book } from "@/types/book";

interface Props {
  books: Book[];
  initialClass?: string;
  initialSubject?: string;
}

export default function BookPageClient({
  books,
  initialClass = "",
  initialSubject = "",
}: Props) {
  const [search, setSearch] = useState("");

  const [selectedClass, setSelectedClass] =
  useState(initialClass);

  const [selectedSubject, setSelectedSubject] =
  useState(initialSubject);

  const [selectedBoard, setSelectedBoard] =
    useState("");

  const [selectedSeries, setSelectedSeries] =
    useState("");

  const [selectedBook, setSelectedBook] =
    useState<Book | null>(null);

  const [modalOpen, setModalOpen] =
    useState(false);

  const classes = [
    ...new Set(books.map((b) => b.class)),
  ];

  const subjects = [
    ...new Set(books.map((b) => b.subject)),
  ];

  const boards = [
    ...new Set(books.map((b) => b.board)),
  ];

  const series = [
    ...new Set(books.map((b) => b.series)),
  ];

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesSearch =
        !search ||
        book.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        book.subject
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        book.series
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesClass =
        !selectedClass ||
        book.class === selectedClass;

      const matchesSubject =
        !selectedSubject ||
        book.subject === selectedSubject;

      const matchesBoard =
        !selectedBoard ||
        book.board === selectedBoard;

      const matchesSeries =
        !selectedSeries ||
        book.series === selectedSeries;

      return (
        matchesSearch &&
        matchesClass &&
        matchesSubject &&
        matchesBoard &&
        matchesSeries
      );
    });
  }, [
    books,
    search,
    selectedClass,
    selectedSubject,
    selectedBoard,
    selectedSeries,
  ]);

  function resetFilters() {
    setSearch("");
    setSelectedClass("");
    setSelectedSubject("");
    setSelectedBoard("");
    setSelectedSeries("");
  }

  function handleInspectionRequest(
    book: Book
  ) {
    setSelectedBook(book);
    setModalOpen(true);
  }

  return (
        <>
      <SearchBar
        value={search}
        onChange={setSearch}
      />

      <BookFilters
        classValue={selectedClass}
        subjectValue={selectedSubject}
        boardValue={selectedBoard}
        seriesValue={selectedSeries}
        classes={classes}
        subjects={subjects}
        boards={boards}
        series={series}
        onClassChange={setSelectedClass}
        onSubjectChange={setSelectedSubject}
        onBoardChange={setSelectedBoard}
        onSeriesChange={setSelectedSeries}
        onReset={resetFilters}
      />

      <div className="mb-8 flex items-center justify-between">

        <h3 className="text-xl font-semibold text-slate-800">
          Showing {filteredBooks.length} Books
        </h3>

      </div>

      <BookGrid books={filteredBooks} />

      <InspectionModal
        open={modalOpen}
        book={selectedBook}
        onClose={() => {
          setModalOpen(false);
          setSelectedBook(null);
        }}
      />
    </>
  );
}