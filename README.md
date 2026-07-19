# VeriVC

**Most AI investment tools generate opinions. VeriVC verifies the evidence behind them.**

VeriVC is a locally runnable, evidence-driven startup due-diligence copilot for Hack Nation 2026 Challenge 2: “The VC Brain — Deploying $100K Checks in 24 Hours.” It helps early-stage VCs, accelerator reviewers, angel investors, and startup judges review companies quickly while preserving provenance, uncertainty, and human oversight.

## What it does

- Creates a startup review from company name, website, GitHub URL, optional public GitHub snapshot, pitch, sector, stage, optional pitch deck PDF, pasted evidence, notes, and review criteria.
- Extracts structured startup claims into typed claim records.
- Links claims to evidence as supported, partially supported, contradicted, insufficient, or unverifiable.
- Detects contradictions and gaps such as unsupported rapid growth, weak market sizing, “no competitors” conflicts, and production-readiness claims without technical proof.
- Scores diligence categories with deterministic, visible rules.
- Generates founder follow-up questions grouped by diligence area.
- Produces Markdown and print-ready HTML investment memos with evidence IDs, limitations, conditions, reviewer override log, and a restrained human-review recommendation.
- Runs fully in deterministic demo mode without paid APIs; optional GitHub analysis uses only unauthenticated public GitHub API calls with timeouts.
- Compares deterministic demo reviews side-by-side to show why evidence quality beats pitch polish.
- Adds a Partner Review Checklist that turns the evidence graph into explicit handoff gates: ready, needs attention, missing, or blocked.
- Adds memo section evidence coverage indicators so investors can see which memo sections are evidence-backed, mixed, weak, or inference-only.
- Lets reviewers manually add or edit claims with required notes, provenance entries, and memo edit logs.
- Lets reviewers manually link or unlink evidence as supporting or contradicting a claim while preserving bidirectional provenance.
- Refreshes derived scorecards, red flags, founder questions, recommendation, and memo from the current human-edited claim/evidence graph.
- Shows an Audit Timeline for intake, evidence capture, reviewer actions, refreshes, and export readiness.
- Supports local review handoff by copying a `verivc-share:v1:` payload that another reviewer can paste into the dashboard import panel without a cloud account.

## Why it is different

VeriVC is not “upload a deck and ask a chatbot for a summary.” The core object is a claim-evidence graph. Each score and memo conclusion points back to extracted claims, source excerpts, preserved evidence IDs, contradictions, and missing information. Polished language is not rewarded unless the evidence supports it.

## Screenshots

Add screenshots here after running the app locally:

- Dashboard with demo company cards
- Review workspace showing readiness score and recommendation
- Claim-evidence explorer with expanded contradiction
- Markdown memo export

## Local setup

```bash
npm install
npm run dev
```

Open the local URL printed by the dev server, usually `http://localhost:3000` or the URL shown by `vinext dev`.

## Demo mode

The app includes two deterministic companies:

1. **Aurelia AI — polished but risky**  
   Attractive AI sales-agent claims, but contradictory MRR/customer details, a “no competitors” conflict, and weak GitHub/product-readiness evidence.

2. **GrainLoop — less flashy, better supported**  
   Modest agtech workflow product with clearer pricing, paid-location evidence, customer references, GitHub execution artifacts, and conditions for partner review.

No API key is required for either demo.

## Environment variables

Optional OpenAI-compatible provider settings are documented in `.env.example`:

```bash
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-mini
```

The current MVP ships with a provider abstraction and mock fallback. The product remains usable when these values are absent.

## Commands

```bash
npm run dev            # local development server
npm run lint           # ESLint
npm run typecheck      # TypeScript check
npm run format:check   # lightweight source formatting guard
npm test               # unit/integration tests for schemas and review engine
npm run build          # production build
npm run test:rendered  # build + server-render smoke test
```

## Architecture summary

- `lib/types.ts` — typed schemas for startup profiles, claims, evidence, evaluations, findings, questions, recommendations, and memos.
- `lib/demoData.ts` — deterministic demo company fixtures and evidence packets.
- `lib/engine.ts` — claim extraction, evidence association, contradiction detection, scoring, recommendation logic, and memo generation.
- `lib/llm.ts` — OpenAI-compatible provider abstraction with mock/provider-unavailable behavior.
- `lib/pdfExtraction.ts` — browser-side PDF upload validation, local text extraction, page-label formatting, truncation handling, and filename sanitization.
- `lib/githubAnalysis.ts` — public GitHub repository URL parsing, API snapshot fetching, timeout handling, and evidence text formatting.
- `lib/reviewerOverrides.ts` — reviewer claim override validation, memo addendum generation, and audit-trail preservation.
- `lib/memoHtmlExport.ts` — standalone printable HTML memo generation with safe escaping, print CSS, and claim/evidence appendices.
- `lib/reviewComparison.ts` — side-by-side review comparison logic for readiness, contradictions, red flags, evidence completeness, traction, and technical credibility.
- `lib/reviewChecklist.ts` — partner-review checklist rules for material evidence coverage, contradictions, traction proof, market support, technical credibility, team evidence, legal review, and memo handoff.
- `lib/memoCoverage.ts` — memo section evidence coverage scoring across claim/evidence links, contradictions, unsupported claims, and inference-only sections.
- `lib/claimEditor.ts` — manual reviewer claim add/edit helpers with validation, provenance entries, and memo edit-log preservation.
- `lib/evidenceLinker.ts` — manual evidence-to-claim support/contradiction link helper with bidirectional graph updates and memo link-log preservation.
- `lib/refreshReview.ts` — deterministic refresh path that rebuilds derived analyses from current claim/evidence records while preserving reviewer audit logs.
- `lib/auditTimeline.ts` — audit event builder for intake, evidence capture, reviewer edits, evidence links, refreshes, and exportability.
- `lib/reviewerAuditLogs.ts` — shared memo addendum builder for overrides, claim edits, and evidence links.
- `lib/sharePackage.ts` — offline `verivc-share:v1:` payload encoding and decoding around the validated audit package schema.
- `app/components/VeriVCApp.tsx` — local review workflow, dashboard, intake, claim-evidence explorer, evidence vault, scorecards, questions, and memo export.

## Privacy and safety notes

- VeriVC is a diligence support tool, not an autonomous investment system.
- It does not transfer money, contact founders, sign documents, or authorize investments.
- It does not fabricate URLs, quotes, metrics, customers, founder backgrounds, or citations.
- Evidence gaps are shown explicitly and reduce confidence.
- Local demo reviews are stored only in browser session state.
- Do not paste sensitive founder or investor data into a demo environment unless you intend to process it locally.
- Local share payloads are not encrypted, signed, or hosted. Treat them like the full audit JSON package and move them only through a secure channel if real diligence data is included.

## Known limitations

- PDF upload now extracts text locally in the browser for text-based PDFs and creates `Page N:` references; scanned/image-only decks, complex tables, charts, and speaker notes may still require pasted excerpts or primary documents.
- Website URLs are captured for provenance. GitHub URLs can optionally fetch a public repository snapshot; failures, private repositories, and rate limits fall back to captured URL/manual evidence.
- Scoring is heuristic and explainable, not statistically calibrated.
- LLM integration is abstracted but not required for the core local demo.
- Primary financial documents, customer contracts, legal review, and founder background checks remain human diligence tasks.

## Hackathon scope

This MVP focuses on the critical workflow: intake → structured profile → claims → evidence → contradictions/gaps → scores → questions → memo → restrained recommendation. It avoids authentication, billing, payments, external submissions, and production data infrastructure.

## Future roadmap

- OCR for scanned pitch decks and richer PDF table/chart extraction.
- Optional public website enrichment with caching, timeouts, and source snapshots.
- Authenticated GitHub enrichment for private repos and richer commit/release/security signals.
- Workflow templates for different funds, accelerators, and competition rubrics.
- Calibrated fund-specific scoring profiles.
- Secure multi-review persistence with export bundles.

## Added in the second iteration

- **Local review library:** completed reviews persist in browser local storage and can be reopened from the dashboard.
- **Audit package export:** download a JSON bundle containing the full review result, claims, evidence, findings, scores, memo, and provenance log.
- **Reviewer-added evidence:** add a new evidence excerpt after a review, then rerun analysis without losing the audit trail.
- **Deck text path:** paste page-labelled deck excerpts so claims can be extracted while the PDF filename remains preserved as an artifact.

## Added in the third iteration

- **Audit package import:** choose a previously exported VeriVC JSON package from the dashboard and reopen the full review graph.
- **Import validation:** imported files must match the `verivc.review.v1` schema and pass review-result validation before entering the review library.
- **Round-trip workflow:** reviewers can export an audit package, share it locally, import it later, add evidence, and rerun the analysis.
- **Copy/paste review handoff:** the Memo tab can copy a `verivc-share:v1:` payload; the dashboard can paste and import it with the same schema validation as JSON packages.

## Added in the fourth iteration

- **Fund scoring profiles:** choose Balanced early-stage, AI seed fund, B2B SaaS accelerator, or Technical angel weighting in the review workspace.
- **Weighted readiness:** VeriVC now shows base readiness alongside fund-weighted readiness, weighted delta, top weighted positives, and must-have gaps.
- **Profile-aware memo export:** copied/downloaded memos include the selected fund scoring profile view without changing the underlying evidence graph.

## Added in the fifth iteration

- **Local PDF extraction:** uploading a text-based PDF pitch deck extracts page-labelled text directly in the browser.
- **Page-level claim provenance:** extracted deck claims now use references such as `Pitch deck page 6` in the claim explorer and memo evidence flow.
- **Defensive upload handling:** PDF validation enforces type and size limits, sanitizes filenames, truncates very long decks, and falls back to pasted text when extraction fails.

## Added in the sixth iteration

- **Public GitHub snapshot:** enter a repository URL and click **Analyze GitHub** to fetch stars, forks, default branch, language mix, README/license presence, contributor sample, and latest commit metadata.
- **GitHub as evidence:** the snapshot is stored as `github` evidence and linked into technical diligence without claiming that repo activity proves product quality.
- **Timeout-safe enrichment:** GitHub analysis is optional, unauthenticated, and non-blocking; unavailable data remains explicit.

## Added in the seventh iteration

- **Reviewer claim overrides:** investors can change a claim status and confidence from the claim explorer with a required reason.
- **Audit-preserved human judgment:** overrides append to claim notes, provenance log, audit JSON, and the Markdown memo override log.
- **Human oversight boundary:** overrides are visible human annotations; adding evidence and rerunning remains the path for rule-based rescoring.

## Added in the eighth iteration

- **Print-ready HTML memo:** the Memo tab now downloads a standalone `.html` investment memo with print CSS.
- **Partner-review appendix:** HTML exports include recommendation summary, fund scoring profile, claim-evidence table, evidence appendix, and human-review boundary.
- **Safe rendering:** memo text is HTML-escaped before export to avoid raw markup injection in downloaded files.

## Added in the ninth iteration

- **Side-by-side demo comparison:** dashboard now has **Compare demos** to contrast Aurelia AI and GrainLoop.
- **Evidence beats polish view:** comparison highlights readiness, contradictions, severe red flags, supported claims, traction evidence, technical credibility, and evidence completeness.
- **Presentation-ready takeaway:** the comparison explicitly shows that VeriVC favors the less flashy but better-supported company.

## Added in the tenth iteration

- **Local share payload:** the Memo tab can copy a `verivc-share:v1:` text payload containing the validated audit package.
- **Paste-to-import handoff:** the dashboard can import pasted share payloads with prefix, size, UTF-8, JSON, schema, and review-shape validation.
- **No cloud dependency:** share payloads are local convenience artifacts, not encrypted collaboration links or investment authorization records.

## Added in the eleventh iteration

- **Partner Review Checklist:** Overview now shows a checklist completion score and explicit handoff state.
- **Review gates:** material evidence coverage, contradiction clearance, traction proof, market support, technology credibility, team evidence, legal boundary, and memo handoff are each marked ready/attention/missing/blocked.
- **Explainable next actions:** every checklist item shows related claim IDs, evidence IDs, rationale, and the next action before partner discussion.

## Added in the twelfth iteration

- **Memo evidence coverage:** the Memo tab shows average section coverage and per-section evidence strength.
- **Section traceability:** each memo section lists related claim IDs, evidence IDs, unsupported claims, contradictions, and missing information.
- **Export continuity:** print-ready HTML memo exports include the same section-level coverage appendix for partner review.

## Added in the thirteenth iteration

- **Manual claim editor:** reviewers can add a new claim from the claim explorer with category, materiality, verifiability, status, confidence, source excerpt, and required note.
- **Claim metadata edits:** reviewers can adjust claim wording/category/materiality/verifiability while preserving existing evidence links.
- **Audit trail preservation:** manual claim additions and edits append to provenance logs, audit JSON, local share payloads, and a memo `Reviewer Claim Edit Log`.

## Added in the fourteenth iteration

- **Manual evidence linker:** each Evidence Vault card can manually link or unlink evidence to a selected claim as support or contradiction.
- **Bidirectional graph updates:** claim support/contradiction arrays and evidence support/contradiction arrays stay synchronized.
- **Traceable link log:** reviewer notes append to claim notes, evidence limitations, provenance log, memo `Reviewer Evidence Link Log`, audit JSON, and local share payloads.

## Added in the fifteenth iteration

- **Derived analysis refresh:** the review workspace now includes **Refresh derived analysis** after manual claim/evidence edits.
- **Current graph recomputation:** refresh rebuilds category evaluations, strengths, red flags, missing information, founder questions, recommendation, and memo from the edited claim/evidence graph.
- **Audit-log continuity:** reviewer override, claim edit, and evidence link logs are regenerated consistently in the refreshed memo and remain in audit JSON/share payloads.

## Added in the sixteenth iteration

- **Audit Timeline:** the review workspace now includes an Audit Timeline tab.
- **Review process traceability:** timeline events cover intake, evidence capture, deterministic analysis steps, reviewer overrides, manual claim edits, manual evidence links, refreshes, and export readiness.
- **Linked audit context:** each event shows related claim IDs and evidence IDs where available so partner reviewers can inspect why a conclusion changed.
