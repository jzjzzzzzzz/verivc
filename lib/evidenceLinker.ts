import { assertReviewResult, type ClaimStatus, type ConfidenceLevel, type Evidence, type ReviewResult } from "./types";

export type ManualEvidenceLinkMode = "supports" | "contradicts";
export type ManualEvidenceLinkAction = "link" | "unlink";

export interface ManualEvidenceLinkInput {
  evidence_id: string;
  claim_id: string;
  mode: ManualEvidenceLinkMode;
  action: ManualEvidenceLinkAction;
  reviewer_note: string;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function without(values: string[], value: string) {
  return values.filter((item) => item !== value);
}

function requireNote(note: string) {
  const trimmed = note.trim();
  if (trimmed.length < 8) throw new Error("Reviewer note must be at least 8 characters.");
  return trimmed;
}

function linkNote(input: ManualEvidenceLinkInput, now: string) {
  return `Reviewer ${input.action === "link" ? "linked" : "unlinked"} evidence ${input.evidence_id} ${input.mode} ${input.claim_id} at ${now}: ${input.reviewer_note.trim()}`;
}

function relationshipLabel(mode: ManualEvidenceLinkMode) {
  return mode === "supports" ? "supporting_evidence_ids" : "contradicting_evidence_ids";
}

function evidenceRelationshipLabel(mode: ManualEvidenceLinkMode) {
  return mode === "supports" ? "supports_claim_ids" : "contradicts_claim_ids";
}

function updatedClaimStatus(claim: ReviewResult["claims"][number]): ClaimStatus {
  if (claim.contradicting_evidence_ids.length) return "contradicted";
  if (claim.supporting_evidence_ids.length && claim.missing_evidence.length) return "partially_supported";
  if (claim.supporting_evidence_ids.length) return "supported";
  if (claim.status === "contradicted" || claim.status === "supported" || claim.status === "partially_supported") return "insufficient_evidence";
  return claim.status;
}

function updatedClaimConfidence(claim: ReviewResult["claims"][number]): ConfidenceLevel {
  if (claim.contradicting_evidence_ids.length) return claim.materiality === "critical" || claim.materiality === "high" ? "high" : "medium";
  if (claim.supporting_evidence_ids.length >= 2) return "high";
  if (claim.supporting_evidence_ids.length === 1) return "medium";
  return claim.confidence === "high" ? "medium" : claim.confidence;
}

function appendManualLimitations(evidence: Evidence, note: string) {
  const manual = `Manual reviewer link: ${note}`;
  return unique([...evidence.limitations, manual]).slice(0, 8);
}

function manualEvidenceLinkLog(review: ReviewResult): string {
  const notes = review.claims.flatMap((claim) => claim.reviewer_notes.filter((note) => note.startsWith("Reviewer linked evidence") || note.startsWith("Reviewer unlinked evidence")));
  if (!notes.length) return "";
  return `\n## Reviewer Evidence Link Log\n${notes.map((note) => `- ${note}`).join("\n")}\n`;
}

function replaceManualEvidenceLinkLog(markdown: string, review: ReviewResult) {
  const withoutExisting = markdown.replace(/\n## Reviewer Evidence Link Log\n[\s\S]*?(?=\n## |$)/u, "").trimEnd();
  const addendum = manualEvidenceLinkLog(review);
  return addendum ? `${withoutExisting}\n${addendum}` : `${withoutExisting}\n`;
}

export function applyManualEvidenceLink(review: ReviewResult, input: ManualEvidenceLinkInput, now = new Date().toISOString()): ReviewResult {
  const note = requireNote(input.reviewer_note);
  const claimExists = review.claims.some((claim) => claim.claim_id === input.claim_id);
  const evidenceExists = review.evidence.some((evidence) => evidence.evidence_id === input.evidence_id);
  if (!claimExists) throw new Error(`Claim not found: ${input.claim_id}.`);
  if (!evidenceExists) throw new Error(`Evidence not found: ${input.evidence_id}.`);
  const claimKey = relationshipLabel(input.mode);
  const oppositeClaimKey = relationshipLabel(input.mode === "supports" ? "contradicts" : "supports");
  const evidenceKey = evidenceRelationshipLabel(input.mode);
  const oppositeEvidenceKey = evidenceRelationshipLabel(input.mode === "supports" ? "contradicts" : "supports");
  const reviewerNote = linkNote(input, now);

  const nextClaims = review.claims.map((claim) => {
    if (claim.claim_id !== input.claim_id) return claim;
    const next = {
      ...claim,
      [claimKey]: input.action === "link" ? unique([...claim[claimKey], input.evidence_id]) : without(claim[claimKey], input.evidence_id),
      [oppositeClaimKey]: input.action === "link" ? without(claim[oppositeClaimKey], input.evidence_id) : claim[oppositeClaimKey],
      reviewer_notes: [...claim.reviewer_notes, reviewerNote],
    };
    return { ...next, status: updatedClaimStatus(next), confidence: updatedClaimConfidence(next) };
  });

  const nextEvidence = review.evidence.map((evidence) => {
    if (evidence.evidence_id !== input.evidence_id) return evidence;
    return {
      ...evidence,
      [evidenceKey]: input.action === "link" ? unique([...evidence[evidenceKey], input.claim_id]) : without(evidence[evidenceKey], input.claim_id),
      [oppositeEvidenceKey]: input.action === "link" ? without(evidence[oppositeEvidenceKey], input.claim_id) : evidence[oppositeEvidenceKey],
      limitations: appendManualLimitations(evidence, note),
    };
  });

  const nextReview = assertReviewResult({
    ...review,
    claims: nextClaims,
    evidence: nextEvidence,
    provenance_log: [...review.provenance_log, `${now}: Reviewer ${input.action === "link" ? "linked" : "unlinked"} ${input.evidence_id} ${input.mode} ${input.claim_id}.`],
  });

  return assertReviewResult({
    ...nextReview,
    memo: { ...nextReview.memo, markdown: replaceManualEvidenceLinkLog(nextReview.memo.markdown, nextReview) },
  });
}
