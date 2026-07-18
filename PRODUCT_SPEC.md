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
8. Copy or download memo.

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
