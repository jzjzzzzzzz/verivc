import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { applyClaimReviewerOverride, memoWithoutOverrideLog } from "../lib/reviewerOverrides.ts";
import { assertReviewResult } from "../lib/types.ts";

test("reviewer claim override updates claim status and audit trail", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const target = review.claims.find((claim) => claim.status === "contradicted");
  assert.ok(target);
  const updated = applyClaimReviewerOverride(review, {
    claimId: target.claim_id,
    status: "partially_supported",
    confidence: "medium",
    note: "Partner reviewed updated Stripe export; contradiction partly resolved pending signed customer list.",
    updatedAt: "2026-07-19T02:00:00.000Z",
  });
  const changed = updated.claims.find((claim) => claim.claim_id === target.claim_id);
  assert.equal(changed?.status, "partially_supported");
  assert.equal(changed?.confidence, "medium");
  assert.ok(changed?.reviewer_notes.some((note) => note.includes("Partner reviewed updated Stripe")));
  assert.ok(changed?.reviewer_overrides?.[0].previous_status === "contradicted");
  assert.match(updated.memo.markdown, /Reviewer Override Log/);
  assert.match(updated.provenance_log.join("\n"), /Reviewer override applied/);
  assert.equal(assertReviewResult(updated), updated);
});

test("reviewer claim override rejects weak notes and unknown claims", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  assert.throws(() => applyClaimReviewerOverride(review, { claimId: review.claims[0].claim_id, status: "supported", confidence: "high", note: "ok" }), /at least 8/);
  assert.throws(() => applyClaimReviewerOverride(review, { claimId: "CL-NOPE", status: "supported", confidence: "high", note: "Reviewer checked source document." }), /Claim not found/);
});

test("memo override log can be replaced without duplication", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const once = applyClaimReviewerOverride(review, { claimId: review.claims[0].claim_id, status: "supported", confidence: "high", note: "Reviewer checked customer reference call notes.", updatedAt: "2026-07-19T02:00:00.000Z" });
  const twice = applyClaimReviewerOverride(once, { claimId: review.claims[0].claim_id, status: "partially_supported", confidence: "medium", note: "Reviewer later required signed contract before treating as fully supported.", updatedAt: "2026-07-19T03:00:00.000Z" });
  assert.equal((twice.memo.markdown.match(/## Reviewer Override Log/g) ?? []).length, 1);
  assert.doesNotMatch(memoWithoutOverrideLog(twice.memo.markdown), /Reviewer Override Log/);
});
