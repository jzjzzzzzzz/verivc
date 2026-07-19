# VeriVC Product Spec

## Product statement

Most AI investment tools generate opinions. VeriVC verifies the evidence behind them.

## Primary user

Early-stage VC, accelerator reviewer, angel investor, or startup competition judge who needs fast but traceable diligence.

## MVP workflow

1. Create review.
2. Enter company details, pitch, URLs, optional GitHub snapshot, notes, optional pitch deck PDF, evidence, and thesis.
3. Extract structured startup profile and typed claims.
4. Link claims to evidence and contradictions.
5. Score diligence categories with visible rules.
6. Generate red flags, missing information, founder questions, memo, and recommendation.
7. Inspect why each conclusion was produced.
8. Copy memo, download Markdown/print-ready HTML memo, or compare deterministic reviews side-by-side.

## Recommendation states

- `proceed_to_partner_review`
- `proceed_with_conditions`
- `request_more_information`
- `manual_review_required`
- `decline_based_on_current_evidence`

## Non-goals

- no payments or real investment execution
- no autonomous legal/financial decisioning
- no founder outreach
- no fabricated citations
- no authentication or billing in MVP

## Second-iteration requirements completed

- Persist recent reviews locally.
- Reopen local reviews from the dashboard.
- Export complete JSON audit package.
- Add reviewer evidence after analysis and rerun claim-evidence linking.
- Accept pasted deck text as a first-class source while preserving uploaded PDF filename provenance.

## Third-iteration requirements completed

- Exported audit packages can be imported from the dashboard.
- Import path validates schema version and review shape before adding to the local review library.
- Copy/paste local share payloads use the same audit package schema and validation path as JSON import.
- Export/import enables an offline handoff loop for judges or investment partners.

## Fourth-iteration requirements completed

- Added fund-specific scoring profiles with explicit dimension weights.
- Added weighted readiness score, weighted delta, top positives, and must-have gaps to the workspace.
- Added selected scoring profile view to memo copy/download output.

## Fifth-iteration requirements completed

- Added browser-side PDF pitch deck text extraction.
- Added page-labelled deck text formatting and page-level claim source references.
- Added PDF validation, filename sanitization, extraction status, truncation handling, and fallback to pasted excerpts.

## Sixth-iteration requirements completed

- Added optional public GitHub repository analysis from the intake form.
- Added GitHub snapshot evidence covering stars, forks, language mix, README/license, contributor sample, latest commit, and limitations.
- Added timeout-safe fallback behavior so unavailable GitHub data never blocks the review.

## Seventh-iteration requirements completed

- Added reviewer-editable claim status and confidence controls.
- Required an override reason and preserved previous/new values.
- Added reviewer override history to claim detail, memo export, provenance log, and audit package JSON.

## Eighth-iteration requirements completed

- Added standalone HTML memo export.
- Added print CSS, recommendation summary, claim/evidence appendices, selected scoring profile, and human-review boundary to the HTML memo.
- Added escaping tests to prevent raw HTML injection in exported memos.

## Ninth-iteration requirements completed

- Added side-by-side deterministic demo comparison.
- Added comparison engine for readiness, recommendation, supported claims, contradictions, red flags, evidence completeness, traction, and technical credibility.
- Added dashboard comparison entry point and presentation-ready takeaway.

## Tenth-iteration requirements completed

- Added `verivc-share:v1:` copy/paste payload generation for completed reviews.
- Added dashboard share payload import with schema validation and clear malformed-payload errors.
- Documented that share payloads are local convenience artifacts only; they do not encrypt, sign, host, or authorize diligence content.

## Eleventh-iteration requirements completed

- Added partner-review checklist engine and Overview panel.
- Added deterministic checklist gates for evidence coverage, contradictions, traction proof, market support, technology credibility, team evidence, legal/regulatory boundary, and memo handoff.
- Added tests proving the polished risky demo is blocked while the better-supported demo produces a stronger checklist score.

## Twelfth-iteration requirements completed

- Added memo section evidence coverage engine and tests.
- Added Memo tab UI indicators for strong/mixed/weak/inference-only sections.
- Added memo coverage appendix to printable HTML export.

## Thirteenth-iteration requirements completed

- Added manual claim editor logic and tests.
- Added Claim Explorer UI for adding reviewer claims and editing claim metadata.
- Added provenance and memo edit-log preservation for manual claim graph changes.

## Fourteenth-iteration requirements completed

- Added manual evidence-to-claim linker logic and tests.
- Added Evidence Vault UI for linking/unlinking evidence as support or contradiction.
- Added bidirectional graph synchronization plus provenance and memo link-log preservation.
