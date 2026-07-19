import type { ClaimStatus, ConfidenceLevel, ReviewerClaimOverride, ReviewResult } from "./types";
import { appendReviewerAuditLogs, stripReviewerAuditLogs } from "./reviewerAuditLogs";
import { assertReviewResult, claimStatuses } from "./types";

export interface ClaimOverrideInput {
  claimId: string;
  status: ClaimStatus;
  confidence: ConfidenceLevel;
  note: string;
  updatedAt?: string;
}

const confidenceLevels = ["high", "medium", "low"] as const satisfies readonly ConfidenceLevel[];

function validateOverride(input: ClaimOverrideInput): string {
  const note = input.note.trim();
  if (!claimStatuses.includes(input.status)) throw new Error(`Invalid claim status: ${input.status}`);
  if (!confidenceLevels.includes(input.confidence)) throw new Error(`Invalid confidence level: ${input.confidence}`);
  if (note.length < 8) throw new Error("Reviewer override note must explain the reason in at least 8 characters.");
  return note.slice(0, 600);
}

export function memoWithoutOverrideLog(markdown: string): string {
  return stripReviewerAuditLogs(markdown);
}

export function applyClaimReviewerOverride(review: ReviewResult, input: ClaimOverrideInput): ReviewResult {
  const note = validateOverride(input);
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  let found = false;

  const claims = review.claims.map((claim) => {
    if (claim.claim_id !== input.claimId) return { ...claim, reviewer_overrides: claim.reviewer_overrides ? [...claim.reviewer_overrides] : undefined };
    found = true;
    const override: ReviewerClaimOverride = {
      override_id: `OVR-${updatedAt.replace(/[^0-9]/g, "").slice(0, 14)}-${claim.claim_id}`,
      claim_id: claim.claim_id,
      previous_status: claim.status,
      new_status: input.status,
      previous_confidence: claim.confidence,
      new_confidence: input.confidence,
      note,
      updated_at: updatedAt,
    };
    return {
      ...claim,
      status: input.status,
      confidence: input.confidence,
      reviewer_notes: [...claim.reviewer_notes, `Reviewer override (${updatedAt}): ${note}`],
      reviewer_overrides: [...(claim.reviewer_overrides ?? []), override],
    };
  });

  if (!found) throw new Error(`Claim not found: ${input.claimId}`);

  const baseMemo = stripReviewerAuditLogs(review.memo.markdown);
  const next: ReviewResult = {
    ...review,
    claims,
    memo: {
      ...review.memo,
      markdown: baseMemo,
      sections: {
        ...review.memo.sections,
        confidence_and_limitations: `${review.memo.sections.confidence_and_limitations}\nReviewer overrides are preserved in the audit log and should be checked against source evidence.`,
      },
    },
    provenance_log: [...review.provenance_log, `Reviewer override applied to ${input.claimId} at ${updatedAt}: ${note}`],
  };
  next.memo = { ...next.memo, markdown: appendReviewerAuditLogs(baseMemo, next) };
  return assertReviewResult(next);
}
