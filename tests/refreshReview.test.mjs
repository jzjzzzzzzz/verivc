import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { applyManualEvidenceLink } from "../lib/evidenceLinker.ts";
import { addManualClaim } from "../lib/claimEditor.ts";
import { applyClaimReviewerOverride } from "../lib/reviewerOverrides.ts";
import { refreshDerivedAnalysis } from "../lib/refreshReview.ts";
import { assertReviewResult } from "../lib/types.ts";

test("refreshDerivedAnalysis recomputes recommendation inputs from reviewer overrides", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const target = review.claims.find((claim) => claim.status === "contradicted");
  assert.ok(target);
  const overridden = applyClaimReviewerOverride(review, {
    claimId: target.claim_id,
    status: "supported",
    confidence: "high",
    note: "Partner reviewed new primary source and cleared this contradiction for demo refresh testing.",
    updatedAt: "2026-07-19T02:00:00.000Z",
  });
  const refreshed = refreshDerivedAnalysis(overridden, "2026-07-19T03:00:00.000Z");
  assert.ok(refreshed.red_flags.every((finding) => !finding.related_claim_ids.includes(target.claim_id)));
  assert.match(refreshed.memo.markdown, /Reviewer Override Log/);
  assert.match(refreshed.memo.markdown, /Partner reviewed new primary source/);
  assert.match(refreshed.provenance_log.at(-1), /refreshed derived analysis/);
  assert.equal(assertReviewResult(refreshed), refreshed);
});

test("refreshDerivedAnalysis preserves manual claims and evidence-link audit logs", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const withClaim = addManualClaim(review, {
    category: "legal",
    claim_text: "GrainLoop uses signed data processing agreements for farm operating records.",
    source_excerpt: "Reviewer call note: DPA template exists but two customers have not signed yet.",
    materiality: "high",
    verifiability: "needs_primary_docs",
    reviewer_note: "Added after legal diligence discussion.",
  }, "2026-07-19T04:00:00.000Z");
  const linked = applyManualEvidenceLink(withClaim, {
    evidence_id: withClaim.evidence[0].evidence_id,
    claim_id: "CL-REV-001",
    mode: "contradicts",
    action: "link",
    reviewer_note: "Existing customer reference says DPAs are not fully signed yet.",
  }, "2026-07-19T04:15:00.000Z");
  const refreshed = refreshDerivedAnalysis(linked, "2026-07-19T04:30:00.000Z");
  const manualClaim = refreshed.claims.find((claim) => claim.claim_id === "CL-REV-001");
  assert.ok(manualClaim);
  assert.equal(manualClaim.status, "contradicted");
  assert.ok(refreshed.red_flags.some((finding) => finding.related_claim_ids.includes("CL-REV-001")));
  assert.match(refreshed.memo.markdown, /Reviewer Claim Edit Log/);
  assert.match(refreshed.memo.markdown, /Reviewer Evidence Link Log/);
  assert.match(refreshed.memo.sections.recommendation, new RegExp(refreshed.recommendation.state));
});
