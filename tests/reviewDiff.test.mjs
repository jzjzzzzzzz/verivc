import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { applyClaimReviewerOverride } from "../lib/reviewerOverrides.ts";
import { refreshDerivedAnalysis } from "../lib/refreshReview.ts";
import { buildReviewRefreshDiff } from "../lib/reviewDiff.ts";

test("review refresh diff explains recommendation and score changes", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const target = review.claims.find((claim) => claim.status === "contradicted");
  assert.ok(target);
  const overridden = applyClaimReviewerOverride(review, {
    claimId: target.claim_id,
    status: "supported",
    confidence: "high",
    note: "Partner resolved this contradiction with primary source evidence for diff testing.",
    updatedAt: "2026-07-19T02:00:00.000Z",
  });
  const refreshed = refreshDerivedAnalysis(overridden, "2026-07-19T03:00:00.000Z");
  assert.ok(refreshed.last_refresh_diff);
  assert.equal(refreshed.last_refresh_diff.refreshed_at, "2026-07-19T03:00:00.000Z");
  assert.match(refreshed.last_refresh_diff.summary, /Recommendation/);
  assert.ok(refreshed.last_refresh_diff.evaluation_changes.length > 0);
});

test("review refresh diff can compare arbitrary review snapshots", () => {
  const before = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const after = { ...before, recommendation: { ...before.recommendation, readiness_score: before.recommendation.readiness_score + 3 } };
  const diff = buildReviewRefreshDiff(before, after, "2026-07-19T04:00:00.000Z");
  assert.equal(diff.readiness_delta, 3);
  assert.match(diff.summary, /increased by 3/);
});
