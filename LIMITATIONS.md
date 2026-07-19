# VeriVC Limitations

- VeriVC is not financial advice.
- VeriVC is not an autonomous investment system and does not authorize, deploy, wire, transfer, or commit capital.
- The recommendation is a decision-support signal for human review, not a legally binding decision.
- Public data may be incomplete, stale, unavailable, or misleading.
- LLM analysis, if enabled later, may be wrong and must be validated against source evidence.
- Private financial claims require primary documents such as bank records, payment processor exports, signed contracts, and customer references.
- Founder identity, employment history, education, technical authorship, and background must not be assumed from weak public-name matches.
- GitHub metrics can help diligence technical execution but do not prove product quality, security, reliability, customer value, ownership, or production readiness.
- PDF upload extracts text locally for text-based PDFs, but scanned/image-only decks, charts, complex tables, hidden speaker notes, and unusual encodings may require pasted excerpts or primary documents.
- Website live enrichment is not required for the deterministic demo. GitHub enrichment is optional and uses unauthenticated public repository data only.
- Legal, regulatory, privacy, securities, tax, employment, and IP issues require qualified human review.
- No real money is transferred, no founders are contacted, and no external commitments are made.

## Second-iteration limitations

- Local review library uses browser `localStorage`; clearing browser data removes saved reviews.
- Audit JSON export is not encrypted and should be handled as a sensitive diligence artifact if real data is entered.
- Local share payloads are encoded for copy/paste convenience only; they are not encrypted, signed, access-controlled, or suitable for public sharing.
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

## Sixth-iteration limitations

- GitHub analysis only works for public repositories visible to the unauthenticated GitHub API.
- Rate limits, network failures, private repos, monorepos, mirrors, generated code, and separate production repositories may make the snapshot incomplete.
- Repository activity is a diligence signal, not proof of technical quality, ownership, production readiness, security, or customer adoption.

## Seventh-iteration limitations

- Reviewer claim overrides are human annotations, not automatic verification and not a substitute for primary evidence.
- Claim overrides update the claim record, memo, and audit trail; category scorecards remain rule-based unless evidence is added and the review is rerun.
- Override reasons should not contain sensitive information unless the local audit package is handled securely.

## Eighth-iteration limitations

- HTML memo export is a static local file; it is not cryptographically signed and does not prove the audit package was unmodified.
- Print layout depends on the reviewer browser/PDF printer settings.
- The HTML memo summarizes appendices; reviewers should keep the full audit JSON for complete machine-readable provenance.

## Ninth-iteration limitations

- Side-by-side comparison is designed for relative triage and demo storytelling, not portfolio ranking or automatic investment selection.
- The stronger evidence case can still require conditions, manual review, or primary documents before partner review.
- Comparing two companies across different sectors or stages requires human context beyond the visible heuristics.
