import assert from "node:assert/strict";
import test from "node:test";

import { mapBookToCatalogBook } from "../lib/book-catalog";

test("catalogue mapping carries persisted price through", () => {
  const mapped = mapBookToCatalogBook({
    id: "book-1",
    slug: "bluegate-science",
    title: "Bluegate Science",
    subtitle: null,
    description: null,
    coverImage: null,
    publicPreviewPdf: null,
    samplePdf: null,
    featured: true,
    isbn: null,
    pages: 128,
    board: "CBSE",
    price: { toString: () => "499.00" },
    class: { name: "Class 8" },
    subject: { name: "Science" },
    series: null,
  });

  assert.equal(mapped.price, "499.00");
  assert.equal(mapped.pages, 128);
  assert.equal(mapped.board, "CBSE");
});

test("catalogue mapping keeps missing price empty", () => {
  const mapped = mapBookToCatalogBook({
    id: "book-2",
    slug: "bluegate-maths",
    title: "Bluegate Maths",
    subtitle: null,
    description: null,
    coverImage: null,
    publicPreviewPdf: null,
    samplePdf: null,
    featured: false,
    isbn: null,
    pages: null,
    board: null,
    price: null,
    class: { name: "Class 6" },
    subject: { name: "Mathematics" },
    series: null,
  });

  assert.equal(mapped.price, "");
});
