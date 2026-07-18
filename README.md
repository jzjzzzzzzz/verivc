# VeriVC

**Most AI investment tools generate opinions. VeriVC verifies the evidence behind them.**

VeriVC is a locally runnable, evidence-driven startup due-diligence copilot for Hack Nation 2026 Challenge 2: “The VC Brain — Deploying $100K Checks in 24 Hours.” It helps early-stage VCs, accelerator reviewers, angel investors, and startup judges review companies quickly while preserving provenance, uncertainty, and human oversight.

## What it does

- Creates a startup review from company name, website, GitHub URL, pitch, sector, stage, optional PDF filename, pasted evidence, notes, and review criteria.
- Extracts structured startup claims into typed claim records.
- Links claims to evidence as supported, partially supported, contradicted, insufficient, or unverifiable.
- Detects contradictions and gaps such as unsupported rapid growth, weak market sizing, “no competitors” conflicts, and production-readiness claims without technical proof.
- Scores diligence categories with deterministic, visible rules.
- Generates founder follow-up questions grouped by diligence area.
- Produces a Markdown investment memo with evidence IDs, limitations, conditions, and a restrained human-review recommendation.
- Runs fully in deterministic demo mode without paid APIs.

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
- `app/components/VeriVCApp.tsx` — local review workflow, dashboard, intake, claim-evidence explorer, evidence vault, scorecards, questions, and memo export.

## Privacy and safety notes

- VeriVC is a diligence support tool, not an autonomous investment system.
- It does not transfer money, contact founders, sign documents, or authorize investments.
- It does not fabricate URLs, quotes, metrics, customers, founder backgrounds, or citations.
- Evidence gaps are shown explicitly and reduce confidence.
- Local demo reviews are stored only in browser session state.
- Do not paste sensitive founder or investor data into a demo environment unless you intend to process it locally.

## Known limitations

- PDF upload currently records the file name as an evidence artifact; paste deck text for claim extraction in this MVP.
- Website and GitHub URLs are captured for provenance, but live scraping is intentionally not required for deterministic demo reliability.
- Scoring is heuristic and explainable, not statistically calibrated.
- LLM integration is abstracted but not required for the core local demo.
- Primary financial documents, customer contracts, legal review, and founder background checks remain human diligence tasks.

## Hackathon scope

This MVP focuses on the critical workflow: intake → structured profile → claims → evidence → contradictions/gaps → scores → questions → memo → restrained recommendation. It avoids authentication, billing, payments, external submissions, and production data infrastructure.

## Future roadmap

- Page-level PDF text extraction with source citations.
- Optional public website/GitHub enrichment with caching, timeouts, and source snapshots.
- Reviewer-editable claim/evidence graph and manual evidence uploads.
- Calibrated fund-specific scoring profiles.
- Secure multi-review persistence with export bundles.
