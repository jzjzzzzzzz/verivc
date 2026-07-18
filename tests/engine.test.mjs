import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { auditPackageFileName, parseAuditPackageJson, serializeAuditPackage } from "../lib/auditPackage.ts";
import { getScoringProfile, summarizeWeightedRecommendation, weightedScore } from "../lib/scoringProfiles.ts";
import { associateEvidence, buildEvidenceFromInput, extractClaims, runReview, runReviewWithEvidencePacket, selectRecommendation } from "../lib/engine.ts";
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


test("deck text becomes claim and evidence provenance", () => {
  const review = runReview({
    companyName: "DeckCo",
    sector: "Vertical SaaS",
    stage: "Seed",
    pitch: "DeckCo helps clinics automate referral intake.",
    deckFileName: "deckco.pdf",
    deckText: "Page 6: DeckCo reached $20K MRR across 12 clinics and charges $400 per clinic per month.",
  });
  assert.ok(review.claims.some((claim) => claim.source_type === "deck" && claim.source_reference === "Pitch deck page 6" && claim.claim_text.includes("$20K MRR")));
  assert.ok(review.evidence.some((item) => item.evidence_id.startsWith("EV-DECKTXT") && item.excerpt.includes("Page 6")));
});

test("review can be rerun with a reviewer-added evidence packet", () => {
  const first = runReview({
    companyName: "PacketCo",
    sector: "Developer Tools",
    stage: "Seed",
    pitch: "PacketCo reached $10K MRR with 5 customers and is raising $500K.",
  });
  const rerun = runReviewWithEvidencePacket(first.input, [
    ...first.evidence,
    {
      evidence_id: "EV-ADD-TEST",
      source_type: "financial_document",
      title: "Payment processor export",
      excerpt: "Payment processor export confirms $10K MRR with 5 active customers in June 2026.",
      captured_at: "2026-07-19T00:00:00.000Z",
      reliability_level: "primary",
      relevance: "high",
      supports_claim_ids: [],
      contradicts_claim_ids: [],
      limitations: ["Synthetic test fixture."],
    },
  ]);
  assert.ok(rerun.evidence.find((item) => item.evidence_id === "EV-ADD-TEST")?.supports_claim_ids.length);
  assert.ok(rerun.claims.some((claim) => claim.supporting_evidence_ids.includes("EV-ADD-TEST")));
});


test("GitHub public snapshot becomes technical evidence", () => {
  const review = runReview({
    companyName: "RepoCo",
    sector: "Developer Tools",
    stage: "Seed",
    githubUrl: "https://github.com/acme/repoco",
    pitch: "RepoCo has a production-ready GitHub repository with tests and active commits.",
    githubSnapshot: "GitHub public snapshot for acme/repoco captured at 2026-07-19T00:00:00.000Z. Stars: 42. Forks: 6. README: present. License: MIT. Recent commit: 2026-07-18 by Dana: Add tests. Limitations: Metrics do not prove quality.",
  });
  const snapshot = review.evidence.find((item) => item.evidence_id.startsWith("EV-GHSNAP"));
  assert.ok(snapshot);
  assert.equal(snapshot.source_type, "github");
  assert.ok(review.claims.some((claim) => claim.category === "technology"));
});


test("audit package serializes and validates review imports", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const serialized = serializeAuditPackage(review);
  const imported = parseAuditPackageJson(serialized);
  assert.equal(imported.schema_version, "verivc.review.v1");
  assert.equal(imported.review.profile.company_name, "GrainLoop");
  assert.equal(imported.review.recommendation.state, review.recommendation.state);
  assert.equal(auditPackageFileName(review), "grainloop-verivc-audit-package.json");
});

test("audit package import rejects malformed or unsupported packages", () => {
  assert.throws(() => parseAuditPackageJson("not json"), /not valid JSON/);
  assert.throws(() => parseAuditPackageJson(JSON.stringify({ schema_version: "other", exported_at: "now", review: {} })), /Unsupported audit package schema/);
  assert.throws(() => parseAuditPackageJson(JSON.stringify({ schema_version: "verivc.review.v1", exported_at: "now" })), /missing review payload/);
});


test("scoring profiles produce explainable weighted readiness", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const aiSeed = getScoringProfile("ai_seed");
  const summary = summarizeWeightedRecommendation(review, aiSeed);
  assert.equal(summary.profile_id, "ai_seed");
  assert.equal(summary.weighted_readiness_score, weightedScore(review.evaluations, aiSeed));
  assert.ok(summary.top_positive_weighted_dimensions.length === 3);
  assert.ok(summary.top_negative_weighted_dimensions.length === 3);
  assert.match(summary.explanation, /weighted score/);
});

test("profile must-have gaps are surfaced", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const summary = summarizeWeightedRecommendation(review, getScoringProfile("ai_seed"));
  assert.ok(summary.must_have_gaps.some((gap) => gap.dimension === "defensibility" || gap.dimension === "technical_credibility"));
});
