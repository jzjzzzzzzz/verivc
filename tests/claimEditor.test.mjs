import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { addManualClaim, editClaimMetadata } from "../lib/claimEditor.ts";

test("manual claim editor adds a reviewer claim with audit trail", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const edited = addManualClaim(review, {
    category: "legal",
    claim_text: "GrainLoop processes customer farm operating data under processor agreements.",
    source_excerpt: "Reviewer note from partner call: data processing agreements are in progress.",
    materiality: "high",
    verifiability: "needs_primary_docs",
    reviewer_note: "Added after partner asked about data rights.",
  }, "2026-07-19T00:00:00.000Z");
  const claim = edited.claims.find((item) => item.claim_id === "CL-REV-001");
  assert.ok(claim);
  assert.equal(claim.status, "insufficient_evidence");
  assert.equal(claim.source_reference, "Reviewer manual claim editor");
  assert.match(edited.memo.markdown, /Reviewer Claim Edit Log/);
  assert.ok(edited.provenance_log.some((entry) => entry.includes("Reviewer added CL-REV-001")));
});

test("manual claim editor edits metadata without removing existing evidence links", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const target = review.claims.find((claim) => claim.supporting_evidence_ids.length > 0);
  assert.ok(target);
  const edited = editClaimMetadata(review, {
    claim_id: target.claim_id,
    category: target.category,
    claim_text: `${target.claim_text} Updated reviewer wording.`,
    materiality: "critical",
    verifiability: target.verifiability,
    reviewer_note: "Clarified wording after reviewing source excerpt.",
  }, "2026-07-19T00:00:00.000Z");
  const claim = edited.claims.find((item) => item.claim_id === target.claim_id);
  assert.ok(claim);
  assert.deepEqual(claim.supporting_evidence_ids, target.supporting_evidence_ids);
  assert.equal(claim.materiality, "critical");
  assert.match(edited.memo.markdown, /Reviewer-edited claim/);
});

test("manual claim editor validates notes and claim IDs", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  assert.throws(() => addManualClaim(review, { category: "legal", claim_text: "Bad", source_excerpt: "Also bad", materiality: "high", verifiability: "direct", reviewer_note: "short" }), /at least 4 characters|at least 8 characters/);
  assert.throws(() => editClaimMetadata(review, { claim_id: "CL-NOPE", category: "legal", claim_text: "Valid enough claim", materiality: "high", verifiability: "direct", reviewer_note: "Long enough note" }), /Claim not found/);
});
