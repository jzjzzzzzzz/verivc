import assert from "node:assert/strict";
import test from "node:test";
import { formatDeckPageText, isPdfUploadLike, sanitizePdfFileName, validatePdfUpload } from "../lib/pdfExtraction.ts";

test("PDF file names are sanitized and kept as PDFs", () => {
  assert.equal(sanitizePdfFileName("../Aurelia Deck FINAL!!.pdf"), "Aurelia Deck FINAL-.pdf");
  assert.equal(sanitizePdfFileName("deck"), "deck.pdf");
  assert.equal(sanitizePdfFileName(""), "pitch-deck.pdf");
});

test("PDF upload validation accepts only small PDF-like files", () => {
  assert.equal(isPdfUploadLike({ name: "pitch.pdf", type: "application/pdf" }), true);
  assert.equal(isPdfUploadLike({ name: "pitch.txt", type: "text/plain" }), false);
  assert.doesNotThrow(() => validatePdfUpload({ name: "pitch.pdf", type: "application/pdf", size: 1024 }));
  assert.throws(() => validatePdfUpload({ name: "pitch.pdf", type: "application/pdf", size: 11 * 1024 * 1024 }), /too large/);
  assert.throws(() => validatePdfUpload({ name: "pitch.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024 }), /Only PDF/);
});

test("PDF page text formatting preserves page references and truncation marker", () => {
  const formatted = formatDeckPageText([
    { pageNumber: 1, text: "  Problem   statement  ", charCount: 20 },
    { pageNumber: 2, text: "Reached $20K MRR across 12 clinics.", charCount: 34 },
    { pageNumber: 3, text: "", charCount: 0 },
  ]);
  assert.match(formatted.text, /Page 1: Problem statement/);
  assert.match(formatted.text, /Page 2: Reached \$20K MRR/);
  assert.equal(formatted.truncated, false);

  const truncated = formatDeckPageText([{ pageNumber: 7, text: "x".repeat(200), charCount: 200 }], 120);
  assert.equal(truncated.truncated, true);
  assert.match(truncated.text, /truncated for local review/);
});
