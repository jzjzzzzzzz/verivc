import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { applyManualEvidenceLink } from "../lib/evidenceLinker.ts";

test("manual evidence linker adds support bidirectionally", () => {
  const review = runReview({ companyName: "SparseLink", sector: "SaaS", stage: "Seed", pitch: "SparseLink reached $10K MRR with 4 customers." }, [{
    evidence_id: "EV-LINK-001",
    source_type: "financial_document",
    title: "Payment export",
    excerpt: "Payment export confirms $10K MRR with 4 paying customers in June 2026.",
    captured_at: "2026-07-19T00:00:00.000Z",
    reliability_level: "primary",
    relevance: "high",
    supports_claim_ids: [],
    contradicts_claim_ids: [],
    limitations: [],
  }]);
  const target = review.claims.find((claim) => claim.claim_text.includes("$10K MRR"));
  assert.ok(target);
  const linked = applyManualEvidenceLink(review, { evidence_id: "EV-LINK-001", claim_id: target.claim_id, mode: "supports", action: "link", reviewer_note: "Reviewer verified payment export matches claim." }, "2026-07-19T00:00:00.000Z");
  const claim = linked.claims.find((item) => item.claim_id === target.claim_id);
  const evidence = linked.evidence.find((item) => item.evidence_id === "EV-LINK-001");
  assert.ok(claim.supporting_evidence_ids.includes("EV-LINK-001"));
  assert.ok(evidence.supports_claim_ids.includes(target.claim_id));
  assert.match(linked.memo.markdown, /Reviewer Evidence Link Log/);
});

test("manual evidence linker moves relationship from support to contradiction", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const target = review.claims.find((claim) => claim.claim_text.includes("no direct competitors"));
  assert.ok(target);
  const evidence = review.evidence.find((item) => item.evidence_id === "EV-AUR-003");
  assert.ok(evidence);
  const linked = applyManualEvidenceLink(review, { evidence_id: evidence.evidence_id, claim_id: target.claim_id, mode: "contradicts", action: "link", reviewer_note: "Reviewer confirmed this market map directly contradicts no-competitor wording." }, "2026-07-19T00:00:00.000Z");
  const claim = linked.claims.find((item) => item.claim_id === target.claim_id);
  assert.ok(claim.contradicting_evidence_ids.includes(evidence.evidence_id));
  assert.ok(!claim.supporting_evidence_ids.includes(evidence.evidence_id));
  assert.equal(claim.status, "contradicted");
});

test("manual evidence linker validates IDs and notes", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const claim = review.claims[0];
  const evidence = review.evidence[0];
  assert.throws(() => applyManualEvidenceLink(review, { evidence_id: evidence.evidence_id, claim_id: claim.claim_id, mode: "supports", action: "link", reviewer_note: "short" }), /at least 8 characters/);
  assert.throws(() => applyManualEvidenceLink(review, { evidence_id: "EV-NOPE", claim_id: claim.claim_id, mode: "supports", action: "link", reviewer_note: "Long enough reviewer note" }), /Evidence not found/);
  assert.throws(() => applyManualEvidenceLink(review, { evidence_id: evidence.evidence_id, claim_id: "CL-NOPE", mode: "supports", action: "link", reviewer_note: "Long enough reviewer note" }), /Claim not found/);
});
