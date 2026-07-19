import { assertReviewResult, claimCategories, claimStatuses, type Claim, type ClaimCategory, type ClaimStatus, type ConfidenceLevel, type Materiality, type ReviewResult, type Verifiability } from "./types";

export interface AddManualClaimInput {
  category: ClaimCategory;
  claim_text: string;
  source_excerpt: string;
  materiality: Materiality;
  verifiability: Verifiability;
  status?: ClaimStatus;
  confidence?: ConfidenceLevel;
  reviewer_note: string;
}

export interface EditClaimInput {
  claim_id: string;
  category: ClaimCategory;
  claim_text: string;
  materiality: Materiality;
  verifiability: Verifiability;
  reviewer_note: string;
}

function normalizeClaimText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9$%\.]+/g, " ").trim();
}

function requireNote(note: string) {
  const trimmed = note.trim();
  if (trimmed.length < 8) throw new Error("Reviewer note must be at least 8 characters.");
  return trimmed;
}

function requireText(value: string, label: string) {
  const trimmed = value.trim();
  if (trimmed.length < 4) throw new Error(`${label} must be at least 4 characters.`);
  return trimmed;
}

function requireCategory(category: ClaimCategory) {
  if (!claimCategories.includes(category)) throw new Error(`Unsupported claim category: ${String(category)}.`);
}

function requireStatus(status: ClaimStatus) {
  if (!claimStatuses.includes(status)) throw new Error(`Unsupported claim status: ${String(status)}.`);
}

function claimEditLog(claims: Claim[]): string {
  const edited = claims.filter((claim) => claim.reviewer_notes.some((note) => note.startsWith("Reviewer-added claim") || note.startsWith("Reviewer-edited claim")));
  if (!edited.length) return "";
  return `\n## Reviewer Claim Edit Log\n${edited.map((claim) => `- ${claim.claim_id}: ${claim.claim_text} — ${claim.reviewer_notes.filter((note) => note.startsWith("Reviewer-added claim") || note.startsWith("Reviewer-edited claim")).join(" ")}`).join("\n")}\n`;
}

function replaceClaimEditLog(markdown: string, claims: Claim[]) {
  const withoutExisting = markdown.replace(/\n## Reviewer Claim Edit Log\n[\s\S]*?(?=\n## |$)/u, "").trimEnd();
  const addendum = claimEditLog(claims);
  return addendum ? `${withoutExisting}\n${addendum}` : `${withoutExisting}\n`;
}

function nextManualClaimId(review: ReviewResult) {
  const existing = review.claims
    .map((claim) => claim.claim_id.match(/^CL-REV-(\d+)$/u)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value));
  const next = existing.length ? Math.max(...existing) + 1 : 1;
  return `CL-REV-${String(next).padStart(3, "0")}`;
}

export function addManualClaim(review: ReviewResult, input: AddManualClaimInput, now = new Date().toISOString()): ReviewResult {
  requireCategory(input.category);
  const status = input.status ?? "insufficient_evidence";
  requireStatus(status);
  const claim_text = requireText(input.claim_text, "Claim text");
  const source_excerpt = requireText(input.source_excerpt, "Source excerpt");
  const note = requireNote(input.reviewer_note);
  const claim: Claim = {
    claim_id: nextManualClaimId(review),
    category: input.category,
    claim_text,
    normalized_claim: normalizeClaimText(claim_text),
    source_type: "manual_evidence",
    source_reference: "Reviewer manual claim editor",
    source_excerpt,
    claim_type: "fact",
    verifiability: input.verifiability,
    materiality: input.materiality,
    status,
    confidence: input.confidence ?? "low",
    supporting_evidence_ids: [],
    contradicting_evidence_ids: [],
    missing_evidence: status === "supported" ? [] : ["Reviewer-added claim requires evidence linking or primary-source verification."],
    reviewer_notes: [`Reviewer-added claim at ${now}: ${note}`],
  };
  const claims = [...review.claims, claim];
  return assertReviewResult({
    ...review,
    claims,
    memo: { ...review.memo, markdown: replaceClaimEditLog(review.memo.markdown, claims) },
    provenance_log: [...review.provenance_log, `${now}: Reviewer added ${claim.claim_id} via manual claim editor.`],
  });
}

export function editClaimMetadata(review: ReviewResult, input: EditClaimInput, now = new Date().toISOString()): ReviewResult {
  requireCategory(input.category);
  const claim_text = requireText(input.claim_text, "Claim text");
  const note = requireNote(input.reviewer_note);
  let found = false;
  const claims = review.claims.map((claim) => {
    if (claim.claim_id !== input.claim_id) return claim;
    found = true;
    const previous = `${claim.category} | ${claim.materiality} | ${claim.verifiability} | ${claim.claim_text}`;
    const next = `${input.category} | ${input.materiality} | ${input.verifiability} | ${claim_text}`;
    return {
      ...claim,
      category: input.category,
      claim_text,
      normalized_claim: normalizeClaimText(claim_text),
      materiality: input.materiality,
      verifiability: input.verifiability,
      reviewer_notes: [...claim.reviewer_notes, `Reviewer-edited claim at ${now}: ${previous} → ${next}. ${note}`],
    } satisfies Claim;
  });
  if (!found) throw new Error(`Claim not found: ${input.claim_id}.`);
  return assertReviewResult({
    ...review,
    claims,
    memo: { ...review.memo, markdown: replaceClaimEditLog(review.memo.markdown, claims) },
    provenance_log: [...review.provenance_log, `${now}: Reviewer edited ${input.claim_id} via manual claim editor.`],
  });
}
