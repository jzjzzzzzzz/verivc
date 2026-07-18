import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { associateEvidence, buildEvidenceFromInput, extractClaims, runReview, selectRecommendation } from "../lib/engine.ts";
import { assertReviewResult, recommendationStates } from "../lib/types.ts";

test("schema validation accepts generated demo reviews", () => {
  for (const demo of demoCompanies) {
    const review = runReview(demo.input, demo.evidence);
    assert.equal(assertReviewResult(review), review);
    assert.ok(review.claims.length >= 5);
    assert.ok(review.evidence.length >= demo.evidence.length);
    assert.ok(recommendationStates.includes(review.recommendation.state));
  }
});

test("claim extraction preserves typed claim fields", () => {
  const claims = extractClaims(demoCompanies[0].input);
  assert.ok(claims.some((claim) => claim.claim_type === "metric"));
  assert.ok(claims.every((claim) => claim.claim_id.startsWith("CL-")));
  assert.ok(claims.every((claim) => claim.source_excerpt.length > 0));
});

test("evidence linking detects support and contradictions", () => {
  const rawClaims = extractClaims(demoCompanies[0].input);
  const evidence = buildEvidenceFromInput(demoCompanies[0].input, demoCompanies[0].evidence);
  const { claims, evidence: linkedEvidence } = associateEvidence(rawClaims, evidence);
  const mrrClaim = claims.find((claim) => claim.claim_text.includes("$82K MRR"));
  assert.ok(mrrClaim, "expected MRR claim");
  assert.equal(mrrClaim.status, "contradicted");
  assert.ok(mrrClaim.contradicting_evidence_ids.includes("EV-AUR-001"));
  assert.ok(linkedEvidence.find((item) => item.evidence_id === "EV-AUR-001")?.contradicts_claim_ids.includes(mrrClaim.claim_id));
});

test("missing evidence reduces confidence for material claims", () => {
  const manual = runReview({
    companyName: "SparseCo",
    sector: "Fintech",
    stage: "Seed",
    pitch: "SparseCo has a $10B market and rapid growth. We reached $100K MRR with 50 enterprise customers.",
  });
  assert.ok(manual.claims.some((claim) => claim.missing_evidence.length > 0));
  assert.notEqual(manual.recommendation.state, "proceed_to_partner_review");
  assert.equal(manual.recommendation.confidence, "low");
});

test("category scoring and recommendation distinguish demo company quality", () => {
  const risky = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const stronger = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  assert.equal(risky.recommendation.state, "decline_based_on_current_evidence");
  assert.equal(stronger.recommendation.state, "proceed_with_conditions");
  assert.ok(stronger.recommendation.readiness_score > risky.recommendation.readiness_score);
  assert.ok(risky.red_flags.length >= 3);
  assert.ok(stronger.red_flags.every((finding) => finding.severity !== "high" && finding.severity !== "critical"));
  assert.ok(stronger.claims.every((claim) => claim.status !== "contradicted"));
});

test("memo generation includes evidence IDs and human-review recommendation", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  assert.match(review.memo.markdown, /# VeriVC Investment Memo: GrainLoop/);
  assert.match(review.memo.markdown, /EV-GRN-001/);
  assert.match(review.memo.markdown, /proceed_with_conditions/);
  assert.ok(review.founder_questions.some((question) => question.group === "legal"));
});

test("recommendation logic escalates conflicts to manual review or decline", () => {
  const risky = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const recommendation = selectRecommendation(risky.evaluations, risky.red_flags, risky.claims);
  assert.equal(recommendation.state, "decline_based_on_current_evidence");
  assert.ok(recommendation.reasons.join(" ").includes("contradiction"));
});
