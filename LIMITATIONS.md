# VeriVC Limitations

- VeriVC is not financial advice.
- VeriVC is not an autonomous investment system and does not authorize, deploy, wire, transfer, or commit capital.
- The recommendation is a decision-support signal for human review, not a legally binding decision.
- Public data may be incomplete, stale, unavailable, or misleading.
- LLM analysis, if enabled later, may be wrong and must be validated against source evidence.
- Private financial claims require primary documents such as bank records, payment processor exports, signed contracts, and customer references.
- Founder identity, employment history, education, technical authorship, and background must not be assumed from weak public-name matches.
- GitHub metrics can help diligence technical execution but do not prove product quality, security, reliability, or customer value.
- PDF upload extracts text locally for text-based PDFs, but scanned/image-only decks, charts, complex tables, hidden speaker notes, and unusual encodings may require pasted excerpts or primary documents.
- Website and GitHub live enrichment are not required for the deterministic demo and are represented through provided snapshots or captured URLs.
- Legal, regulatory, privacy, securities, tax, employment, and IP issues require qualified human review.
- No real money is transferred, no founders are contacted, and no external commitments are made.

## Second-iteration limitations

- Local review library uses browser `localStorage`; clearing browser data removes saved reviews.
- Audit JSON export is not encrypted and should be handled as a sensitive diligence artifact if real data is entered.
- Reviewer-added evidence is not automatically authenticated; the reviewer must verify the source before relying on it.
- In the second iteration deck text extraction was paste-based; later local PDF extraction still remains best-effort and editable by the reviewer.

## Third-iteration limitations

- Audit package import validates structure but does not cryptographically verify provenance or detect tampering.
- Imported JSON should be treated as sensitive and only loaded from trusted local sources.

## Fourth-iteration limitations

- Fund scoring profiles are heuristic weights, not calibrated investment outcomes.
- Profile-weighted readiness changes emphasis but does not override unresolved contradictions, legal review, or human judgment.

## Fifth-iteration limitations

- PDF extraction is best-effort text extraction, not OCR and not layout verification.
- Extracted deck text may omit images, charts, tables, footnotes, or speaker notes; page labels support traceability but are not a substitute for reviewing the original deck.
- The app enforces a local file-size/page/character limit to keep browser extraction responsive.
