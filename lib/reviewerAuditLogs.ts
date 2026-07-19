import type { Claim, ReviewResult } from "./types";

const auditSectionTitles = ["Reviewer Override Log", "Reviewer Claim Edit Log", "Reviewer Evidence Link Log"] as const;

function stripSection(markdown: string, title: string) {
  return markdown.replace(new RegExp(`\\n{1,2}## ${title}\\n[\\s\\S]*?(?=\\n## |$)`, "gu"), "").trimEnd();
}

export function stripReviewerAuditLogs(markdown: string): string {
  return auditSectionTitles.reduce((text, title) => stripSection(text, title), markdown).trimEnd();
}

export function buildReviewerOverrideLog(review: ReviewResult): string {
  const overrides = review.claims.flatMap((claim) => claim.reviewer_overrides ?? []);
  if (!overrides.length) return "";
  const rows = overrides
    .map((override) => `- ${override.updated_at}: ${override.claim_id} ${override.previous_status}/${override.previous_confidence} -> ${override.new_status}/${override.new_confidence}. Reason: ${override.note}`)
    .join("\n");
  return `\n\n## Reviewer Override Log\nThese human edits adjust claim-level interpretation and are preserved for audit. They do not execute investments or replace primary-source diligence.\n\n${rows}\n`;
}

export function buildReviewerClaimEditLog(claims: Claim[]): string {
  const edited = claims.filter((claim) => claim.reviewer_notes.some((note) => note.startsWith("Reviewer-added claim") || note.startsWith("Reviewer-edited claim")));
  if (!edited.length) return "";
  return `\n\n## Reviewer Claim Edit Log\n${edited.map((claim) => `- ${claim.claim_id}: ${claim.claim_text} — ${claim.reviewer_notes.filter((note) => note.startsWith("Reviewer-added claim") || note.startsWith("Reviewer-edited claim")).join(" ")}`).join("\n")}\n`;
}

export function buildReviewerEvidenceLinkLog(review: ReviewResult): string {
  const notes = review.claims.flatMap((claim) => claim.reviewer_notes.filter((note) => note.startsWith("Reviewer linked evidence") || note.startsWith("Reviewer unlinked evidence")));
  if (!notes.length) return "";
  return `\n\n## Reviewer Evidence Link Log\n${notes.map((note) => `- ${note}`).join("\n")}\n`;
}

export function appendReviewerAuditLogs(markdown: string, review: ReviewResult): string {
  const base = stripReviewerAuditLogs(markdown);
  const logs = [buildReviewerOverrideLog(review), buildReviewerClaimEditLog(review.claims), buildReviewerEvidenceLinkLog(review)].filter(Boolean).join("");
  return logs ? `${base}${logs}` : `${base}\n`;
}
