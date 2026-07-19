import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { addManualClaim } from "../lib/claimEditor.ts";
import { applyManualEvidenceLink } from "../lib/evidenceLinker.ts";
import { applyClaimReviewerOverride } from "../lib/reviewerOverrides.ts";
import { refreshDerivedAnalysis } from "../lib/refreshReview.ts";
import { buildAuditTimeline, summarizeAuditTimeline } from "../lib/auditTimeline.ts";

test("audit timeline includes intake, evidence capture, and exportability", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const events = buildAuditTimeline(review);
  assert.ok(events.some((event) => event.event_type === "intake"));
  assert.ok(events.some((event) => event.title.includes("Evidence captured")));
  assert.equal(events.at(-1)?.event_type, "exportable_audit");
  const summary = summarizeAuditTimeline(events);
  assert.equal(summary.total_events, events.length);
});

test("audit timeline surfaces human graph edits and refresh actions", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const claim = review.claims.find((item) => item.status === "contradicted");
  assert.ok(claim);
  const withOverride = applyClaimReviewerOverride(review, {
    claimId: claim.claim_id,
    status: "partially_supported",
    confidence: "medium",
    note: "Reviewer checked updated data-room export and wants this tracked in timeline.",
    updatedAt: "2026-07-19T02:00:00.000Z",
  });
  const withClaim = addManualClaim(withOverride, {
    category: "legal",
    claim_text: "Aurelia requires privacy review before enterprise pilots can expand.",
    source_excerpt: "Reviewer legal note says privacy review is pending.",
    materiality: "high",
    verifiability: "needs_primary_docs",
    reviewer_note: "Added after partner asked for privacy diligence.",
  }, "2026-07-19T02:10:00.000Z");
  const linked = applyManualEvidenceLink(withClaim, {
    evidence_id: withClaim.evidence[0].evidence_id,
    claim_id: "CL-REV-001",
    mode: "supports",
    action: "link",
    reviewer_note: "Reviewer tied the note to the current data-room excerpt.",
  }, "2026-07-19T02:20:00.000Z");
  const refreshed = refreshDerivedAnalysis(linked, "2026-07-19T02:30:00.000Z");
  const events = buildAuditTimeline(refreshed);
  assert.ok(events.some((event) => event.event_type === "claim_override"));
  assert.ok(events.some((event) => event.event_type === "claim_edit"));
  assert.ok(events.some((event) => event.event_type === "evidence_link"));
  assert.ok(events.some((event) => event.event_type === "refresh"));
  const summary = summarizeAuditTimeline(events);
  assert.ok(summary.human_actions >= 3);
  assert.equal(summary.refreshes, 1);
});
