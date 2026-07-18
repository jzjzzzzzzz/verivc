# VeriVC Architecture

## Intake

The client captures company details, website URL, GitHub URL, short pitch, sector, stage, optional deck filename, pasted evidence, notes, and investor thesis. The MVP runs locally in the browser and does not require authentication or a hosted database.

## Domain model

`lib/types.ts` defines the typed review graph:

- `StartupInput`
- `StartupProfile`
- `Claim`
- `Evidence`
- `CategoryEvaluation`
- `RiskFinding`
- `FounderQuestion`
- `Recommendation`
- `InvestmentMemo`
- `ReviewResult`

The review result is validated with `assertReviewResult` so invalid statuses, missing profile fields, and out-of-range scores fail tests.

## Claim extraction

`extractClaims` uses deterministic sentence splitting and keyword/metric heuristics to identify material claims from pitch text and reviewer/founder notes. Claims keep source type, source reference, source excerpt, claim type, verifiability, and materiality.

This is intentionally transparent for the hackathon MVP. Optional LLM extraction can be added behind the same schema without changing the UI.

## Evidence model

Evidence preserves provenance:

- evidence ID
- source type
- title
- URL or file reference when available
- excerpt
- capture timestamp
- reliability level
- relevance
- linked support/contradiction claim IDs
- limitations

The system never invents missing evidence. Website/GitHub URLs and PDF filenames are captured as provenance artifacts unless an enrichment/extraction provider is explicitly added.

## Evidence association

`associateEvidence` links each claim to evidence using visible rules:

- lexical overlap for general support
- numeric matching for metric support
- source-specific rules for traction, GitHub, and customer references
- contradiction patterns for known diligence issues such as MRR conflicts, “no direct competitors,” production-ready claims versus incomplete repositories, and unpaid pilots versus customer claims

Each claim receives a status and confidence level from the visible evidence state.

## Contradiction and gap detection

`detectFindings` turns contradicted and unsupported high-materiality claims into explainable risk findings. `missingEvidenceFor` lists information needed to raise confidence, such as primary financial documents, bottom-up market sizing, repository/deployment proof, customer lists, or competitor maps.

## Evaluation engine

`evaluateCategories` scores 12 dimensions:

- problem clarity
- product strength
- market evidence
- business model
- traction evidence
- technical credibility
- team evidence
- competition awareness
- defensibility
- execution risk
- evidence completeness
- transparency

Scores are deterministic and based on claim statuses, evidence coverage, contradictions, and explicit fallback rules. Confidence is lower when evidence is absent or contradictory.

## Recommendation logic

`selectRecommendation` produces restrained states only:

- `proceed_to_partner_review`
- `proceed_with_conditions`
- `request_more_information`
- `manual_review_required`
- `decline_based_on_current_evidence`

The logic considers average score, evidence coverage, contradiction count, high-severity findings, and unsupported high-materiality claims. The recommendation always includes reasons, required conditions, confidence, and a human-review note.

## LLM boundary

`lib/llm.ts` provides an OpenAI-compatible abstraction and mock fallback. The local MVP works without API keys. Any future LLM use must produce strict JSON, pass schema validation, and never fabricate evidence or citations. LLM outputs should be treated as extraction/classification assistance, not as final investment authority.

## Provenance

Every review includes a provenance log stating where data came from and how it was processed. Evidence IDs appear in claim cards, risk findings, scorecards, and memos.

## Export flow

The memo is generated as Markdown in `buildMemo`. The UI supports copying to clipboard or downloading a `.md` file for partner review.

## Second-iteration workflow additions

### Local review library

The client stores recent `ReviewResult` objects in browser `localStorage` under `verivc.reviews.v2`. This is intentionally local-only persistence for hackathon reliability and avoids user accounts, backend storage, and sensitive multi-tenant data concerns.

### Reviewer-added evidence

The Evidence Vault now includes a manual evidence form. A reviewer can add a source type, reliability level, source locator, title, and exact excerpt. The app calls `runReviewWithEvidencePacket`, which relinks claims against the complete evidence packet and regenerates scores, findings, questions, recommendation, and memo.

### Audit package export

The UI can export a JSON audit package with schema version, export timestamp, and the complete review graph. This is designed for partner review, debugging, or future import support.

### Deck text handling

`StartupInput.deckText` captures pasted or extracted deck text. The engine treats it as both a claim source and a deck evidence artifact, while the PDF filename remains preserved separately. This avoids pretending that an uploaded PDF has been parsed when only the filename is available.

## Third-iteration audit import

`lib/auditPackage.ts` centralizes audit package serialization and parsing. An audit package has:

- `schema_version: verivc.review.v1`
- `exported_at`
- `review`

`parseAuditPackageJson` rejects malformed JSON, unsupported schema versions, missing review payloads, invalid recommendation states, invalid claim statuses, and out-of-range scores. The dashboard import UI only saves the review after validation succeeds.

## Fourth-iteration fund scoring profiles

`lib/scoringProfiles.ts` adds profile-specific dimension weights on top of the original deterministic category evaluations. The underlying claim statuses, evidence links, contradictions, and base recommendation do not change. The profile layer calculates:

- weighted readiness score
- delta versus base readiness
- top weighted positive dimensions
- lowest weighted contributions
- must-have gaps below threshold

This keeps fund-thesis customization explainable while preserving the evidence-first review graph.
