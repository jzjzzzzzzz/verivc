import type { Claim, Evidence, ReviewResult } from "./types";

export type ChecklistStatus = "ready" | "needs_attention" | "missing" | "blocked";
export type ChecklistPriority = "critical" | "high" | "medium" | "low";
export type ChecklistGroup = "evidence" | "risk" | "market" | "traction" | "technology" | "team" | "legal" | "memo";

export interface PartnerChecklistItem {
  item_id: string;
  group: ChecklistGroup;
  label: string;
  status: ChecklistStatus;
  priority: ChecklistPriority;
  explanation: string;
  claim_ids: string[];
  evidence_ids: string[];
  next_action: string;
}

export interface PartnerReviewChecklist {
  overall_status: ChecklistStatus;
  completion_score: number;
  ready_count: number;
  needs_attention_count: number;
  missing_count: number;
  blocked_count: number;
  items: PartnerChecklistItem[];
  summary: string;
}

const statusWeights: Record<ChecklistStatus, number> = {
  ready: 1,
  needs_attention: 0.58,
  missing: 0.25,
  blocked: 0,
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function claimsByCategory(review: ReviewResult, category: Claim["category"]) {
  return review.claims.filter((claim) => claim.category === category);
}

function evidenceForClaims(claims: Claim[]) {
  return unique(claims.flatMap((claim) => [...claim.supporting_evidence_ids, ...claim.contradicting_evidence_ids]));
}

function highReliabilityEvidence(review: ReviewResult, evidenceIds: string[]) {
  const ids = new Set(evidenceIds);
  return review.evidence.filter((item) => ids.has(item.evidence_id) && ["primary", "high"].includes(item.reliability_level));
}

function materialClaims(review: ReviewResult) {
  return review.claims.filter((claim) => ["critical", "high"].includes(claim.materiality));
}

function supportedMaterialCoverage(review: ReviewResult) {
  const material = materialClaims(review);
  if (!material.length) return 0;
  const covered = material.filter((claim) => ["supported", "partially_supported"].includes(claim.status)).length;
  return covered / material.length;
}

function categoryScore(review: ReviewResult, dimension: string) {
  return review.evaluations.find((evaluation) => evaluation.dimension === dimension)?.score ?? 0;
}

function createItem(item: PartnerChecklistItem): PartnerChecklistItem {
  return {
    ...item,
    claim_ids: unique(item.claim_ids),
    evidence_ids: unique(item.evidence_ids),
  };
}

function evidenceCoverageItem(review: ReviewResult): PartnerChecklistItem {
  const material = materialClaims(review);
  const coverage = supportedMaterialCoverage(review);
  const status: ChecklistStatus = coverage >= 0.72 ? "ready" : coverage >= 0.48 ? "needs_attention" : "missing";
  return createItem({
    item_id: "CHK-EVIDENCE-COVERAGE",
    group: "evidence",
    label: "Material claim evidence coverage",
    status,
    priority: "critical",
    explanation: `${Math.round(coverage * 100)}% of critical/high-materiality claims are supported or partially supported by linked evidence.`,
    claim_ids: material.map((claim) => claim.claim_id),
    evidence_ids: evidenceForClaims(material),
    next_action: status === "ready" ? "Keep evidence IDs attached in the partner memo." : "Collect primary evidence for the highest-materiality unsupported claims before partner review.",
  });
}

function contradictionItem(review: ReviewResult): PartnerChecklistItem {
  const contradicted = review.claims.filter((claim) => claim.status === "contradicted");
  const severeFlags = review.red_flags.filter((flag) => ["critical", "high"].includes(flag.severity));
  const status: ChecklistStatus = severeFlags.length || contradicted.some((claim) => ["critical", "high"].includes(claim.materiality)) ? "blocked" : contradicted.length ? "needs_attention" : "ready";
  return createItem({
    item_id: "CHK-RISK-CONTRADICTIONS",
    group: "risk",
    label: "Critical contradiction clearance",
    status,
    priority: "critical",
    explanation: contradicted.length ? `${contradicted.length} contradicted claim(s) and ${severeFlags.length} high/critical red flag(s) require resolution.` : "No contradicted claims were detected in the current evidence graph.",
    claim_ids: contradicted.map((claim) => claim.claim_id),
    evidence_ids: unique([...evidenceForClaims(contradicted), ...severeFlags.flatMap((flag) => flag.evidence_ids)]),
    next_action: status === "ready" ? "Retain contradiction scan in the memo appendix." : "Resolve conflicting source records or move the review to manual partner review before proceeding.",
  });
}

function categoryItem(review: ReviewResult, config: { item_id: string; group: ChecklistGroup; label: string; dimension: string; category: Claim["category"]; priority: ChecklistPriority; readyScore: number; attentionScore: number; readyAction: string; missingAction: string; }): PartnerChecklistItem {
  const claims = claimsByCategory(review, config.category);
  const score = categoryScore(review, config.dimension);
  const status: ChecklistStatus = score >= config.readyScore ? "ready" : score >= config.attentionScore ? "needs_attention" : claims.length ? "missing" : "missing";
  return createItem({
    item_id: config.item_id,
    group: config.group,
    label: config.label,
    status,
    priority: config.priority,
    explanation: `${config.dimension.replaceAll("_", " ")} score is ${score}/100 across ${claims.length} related claim(s).`,
    claim_ids: claims.map((claim) => claim.claim_id),
    evidence_ids: evidenceForClaims(claims),
    next_action: status === "ready" ? config.readyAction : config.missingAction,
  });
}

function tractionItem(review: ReviewResult): PartnerChecklistItem {
  const claims = claimsByCategory(review, "traction");
  const linkedEvidence = evidenceForClaims(claims);
  const primaryEvidence = highReliabilityEvidence(review, linkedEvidence);
  const score = categoryScore(review, "traction_evidence");
  const status: ChecklistStatus = score >= 70 && primaryEvidence.length ? "ready" : score >= 48 || primaryEvidence.length ? "needs_attention" : claims.length ? "missing" : "missing";
  return createItem({
    item_id: "CHK-TRACTION-PRIMARY-PROOF",
    group: "traction",
    label: "Traction proof package",
    status,
    priority: "critical",
    explanation: `Traction evidence score is ${score}/100 with ${primaryEvidence.length} primary/high-reliability traction-linked evidence item(s).`,
    claim_ids: claims.map((claim) => claim.claim_id),
    evidence_ids: linkedEvidence,
    next_action: status === "ready" ? "Include traction source excerpts in partner memo conditions." : "Request payment exports, signed customer references, active user cohorts, or pipeline detail for traction claims.",
  });
}

function legalItem(review: ReviewResult): PartnerChecklistItem {
  const legalClaims = claimsByCategory(review, "legal");
  const legalFlags = review.red_flags.filter((flag) => /legal|regulat|compliance|privacy|license|gdpr|hipaa/i.test(`${flag.title} ${flag.explanation}`));
  const status: ChecklistStatus = legalFlags.some((flag) => ["critical", "high"].includes(flag.severity)) ? "blocked" : legalFlags.length || legalClaims.some((claim) => claim.status !== "supported") ? "needs_attention" : legalClaims.length ? "ready" : "needs_attention";
  return createItem({
    item_id: "CHK-LEGAL-REGULATORY",
    group: "legal",
    label: "Legal and regulatory review boundary",
    status,
    priority: "high",
    explanation: legalClaims.length ? `${legalClaims.length} legal/regulatory claim(s) found; ${legalFlags.length} related risk finding(s) surfaced.` : "No explicit legal/regulatory claim was supplied, so counsel-sensitive diligence remains open.",
    claim_ids: legalClaims.map((claim) => claim.claim_id),
    evidence_ids: unique([...evidenceForClaims(legalClaims), ...legalFlags.flatMap((flag) => flag.evidence_ids)]),
    next_action: status === "ready" ? "Keep counsel review as a standard closing condition." : "Ask for compliance posture, data handling, IP ownership, customer-contract, and counsel review details.",
  });
}

function memoItem(review: ReviewResult): PartnerChecklistItem {
  const hasConditions = review.recommendation.required_conditions.length > 0;
  const hasQuestions = review.founder_questions.length > 0;
  const status: ChecklistStatus = review.memo.markdown.includes("## Recommendation") && review.recommendation.human_review_note ? "ready" : "needs_attention";
  return createItem({
    item_id: "CHK-MEMO-HANDOFF",
    group: "memo",
    label: "Partner memo handoff completeness",
    status,
    priority: "medium",
    explanation: `Memo includes recommendation state ${review.recommendation.state}, ${review.red_flags.length} red flag(s), ${review.missing_information.length} missing-information item(s), ${hasQuestions ? review.founder_questions.length : 0} founder question(s), and ${hasConditions ? review.recommendation.required_conditions.length : 0} condition(s).`,
    claim_ids: review.claims.slice(0, 8).map((claim) => claim.claim_id),
    evidence_ids: review.evidence.slice(0, 8).map((evidence) => evidence.evidence_id),
    next_action: status === "ready" ? "Export Markdown/HTML memo plus audit JSON or share payload for partner review." : "Regenerate or inspect the memo before sharing.",
  });
}

export function buildPartnerReviewChecklist(review: ReviewResult): PartnerReviewChecklist {
  const items = [
    evidenceCoverageItem(review),
    contradictionItem(review),
    tractionItem(review),
    categoryItem(review, {
      item_id: "CHK-MARKET-SUPPORT",
      group: "market",
      label: "Market claim support",
      dimension: "market_evidence",
      category: "market",
      priority: "high",
      readyScore: 68,
      attentionScore: 48,
      readyAction: "Show the market evidence and source limitations in the memo.",
      missingAction: "Ask for bottom-up market logic, source documents, and customer segmentation before relying on market-size claims.",
    }),
    categoryItem(review, {
      item_id: "CHK-TECH-CREDIBILITY",
      group: "technology",
      label: "Technology credibility package",
      dimension: "technical_credibility",
      category: "technology",
      priority: "high",
      readyScore: 68,
      attentionScore: 48,
      readyAction: "Include repo/product evidence IDs and limitations in the technical assessment.",
      missingAction: "Request repo access, architecture notes, deployment evidence, test coverage, security posture, or product walkthrough artifacts.",
    }),
    categoryItem(review, {
      item_id: "CHK-TEAM-EVIDENCE",
      group: "team",
      label: "Team evidence and execution fit",
      dimension: "team_evidence",
      category: "team",
      priority: "medium",
      readyScore: 66,
      attentionScore: 46,
      readyAction: "Keep team evidence as traceable support, not assumed identity verification.",
      missingAction: "Request founder bios, role ownership, references, prior results, and verification for material credential claims.",
    }),
    legalItem(review),
    memoItem(review),
  ];

  const completion_score = Math.round((items.reduce((sum, item) => sum + statusWeights[item.status], 0) / items.length) * 100);
  const ready_count = items.filter((item) => item.status === "ready").length;
  const needs_attention_count = items.filter((item) => item.status === "needs_attention").length;
  const missing_count = items.filter((item) => item.status === "missing").length;
  const blocked_count = items.filter((item) => item.status === "blocked").length;
  const overall_status: ChecklistStatus = blocked_count ? "blocked" : completion_score >= 78 ? "ready" : completion_score >= 55 ? "needs_attention" : "missing";
  const summary = blocked_count
    ? "Partner review is blocked until critical contradictions or legal/risk issues are resolved."
    : overall_status === "ready"
      ? "The review package is ready for partner discussion with explicit conditions and evidence provenance."
      : "The review can continue, but unresolved evidence gaps should be addressed before partner discussion.";

  return { overall_status, completion_score, ready_count, needs_attention_count, missing_count, blocked_count, items, summary };
}
