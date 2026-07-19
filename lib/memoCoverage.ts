import type { Claim, ConfidenceLevel, InvestmentMemo, ReviewResult } from "./types";

export type MemoCoverageStatus = "strong_evidence" | "mixed_evidence" | "weak_evidence" | "inference_only";
export type MemoSectionKey = keyof InvestmentMemo["sections"];

export interface MemoSectionCoverage {
  section_key: MemoSectionKey;
  title: string;
  coverage_score: number;
  status: MemoCoverageStatus;
  confidence: ConfidenceLevel;
  related_claim_ids: string[];
  evidence_ids: string[];
  unsupported_claim_ids: string[];
  contradiction_claim_ids: string[];
  missing_information: string[];
  explanation: string;
}

export interface MemoCoverageSummary {
  average_coverage_score: number;
  strong_sections: number;
  mixed_sections: number;
  weak_sections: number;
  inference_only_sections: number;
  sections: MemoSectionCoverage[];
  summary: string;
}

const sectionTitles: Record<MemoSectionKey, string> = {
  executive_summary: "Executive Summary",
  company_overview: "Company Overview",
  investment_thesis: "Investment Thesis",
  evidence_backed_strengths: "Evidence-Backed Strengths",
  red_flags: "Red Flags",
  unresolved_questions: "Unresolved Questions",
  market_analysis: "Market Analysis",
  product_and_technology: "Product and Technology Assessment",
  traction_assessment: "Traction Assessment",
  team_assessment: "Team Assessment",
  competition: "Competition",
  risks: "Risks",
  conditions: "Conditions",
  recommendation: "Recommendation",
  confidence_and_limitations: "Confidence and Limitations",
};

const sectionCategories: Partial<Record<MemoSectionKey, Claim["category"][]>> = {
  company_overview: ["problem", "product"],
  evidence_backed_strengths: ["problem", "product", "business_model", "team", "traction", "technology"],
  market_analysis: ["market"],
  product_and_technology: ["product", "technology", "defensibility"],
  traction_assessment: ["traction", "business_model"],
  team_assessment: ["team"],
  competition: ["competition", "defensibility"],
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function statusFromScore(score: number, hasClaimsOrEvidence: boolean): MemoCoverageStatus {
  if (!hasClaimsOrEvidence) return "inference_only";
  if (score >= 72) return "strong_evidence";
  if (score >= 46) return "mixed_evidence";
  return "weak_evidence";
}

function confidenceFromScore(score: number, status: MemoCoverageStatus): ConfidenceLevel {
  if (status === "inference_only") return "low";
  if (score >= 72) return "high";
  if (score >= 46) return "medium";
  return "low";
}

function evidenceIdsForClaims(claims: Claim[]) {
  return unique(claims.flatMap((claim) => [...claim.supporting_evidence_ids, ...claim.contradicting_evidence_ids]));
}

function claimsForSection(review: ReviewResult, section: MemoSectionKey): Claim[] {
  if (section === "executive_summary" || section === "recommendation" || section === "confidence_and_limitations") {
    return review.claims.filter((claim) => ["critical", "high"].includes(claim.materiality));
  }
  if (section === "red_flags" || section === "risks") {
    const ids = new Set(review.red_flags.flatMap((finding) => finding.related_claim_ids));
    return review.claims.filter((claim) => ids.has(claim.claim_id));
  }
  if (section === "unresolved_questions" || section === "conditions") {
    const ids = new Set([...review.founder_questions.flatMap((question) => question.related_claim_ids), ...review.red_flags.flatMap((finding) => finding.related_claim_ids)]);
    return review.claims.filter((claim) => ids.has(claim.claim_id));
  }
  if (section === "investment_thesis") return [];
  const categories = sectionCategories[section] ?? [];
  return review.claims.filter((claim) => categories.includes(claim.category));
}

function evidenceForSection(review: ReviewResult, section: MemoSectionKey, claims: Claim[]) {
  if (section === "confidence_and_limitations") return review.evidence.map((item) => item.evidence_id);
  const claimEvidenceIds = evidenceIdsForClaims(claims);
  if (section === "red_flags" || section === "risks" || section === "conditions" || section === "unresolved_questions") {
    return unique([...claimEvidenceIds, ...review.red_flags.flatMap((finding) => finding.evidence_ids)]);
  }
  return claimEvidenceIds;
}

function missingForSection(review: ReviewResult, section: MemoSectionKey, claims: Claim[]) {
  const fromClaims = claims.flatMap((claim) => claim.missing_evidence);
  if (section === "conditions") return unique([...fromClaims, ...review.recommendation.required_conditions]);
  if (section === "unresolved_questions") return unique([...fromClaims, ...review.founder_questions.map((question) => question.rationale)]).slice(0, 8);
  if (section === "red_flags" || section === "risks") return unique([...fromClaims, ...review.red_flags.flatMap((finding) => finding.missing_data)]).slice(0, 8);
  return unique(fromClaims).slice(0, 8);
}

function scoreSection(review: ReviewResult, section: MemoSectionKey, claims: Claim[], evidenceIds: string[], missing: string[]) {
  if (!claims.length && !evidenceIds.length) return 12;
  const supported = claims.filter((claim) => claim.status === "supported").length;
  const partial = claims.filter((claim) => claim.status === "partially_supported").length;
  const contradicted = claims.filter((claim) => claim.status === "contradicted").length;
  const unsupported = claims.filter((claim) => ["insufficient_evidence", "unverifiable", "not_evaluated"].includes(claim.status)).length;
  const claimBase = claims.length ? ((supported + partial * 0.65 + contradicted * 0.1) / claims.length) * 68 : 28;
  const evidence = review.evidence.filter((item) => evidenceIds.includes(item.evidence_id));
  const strongEvidence = evidence.filter((item) => ["primary", "high"].includes(item.reliability_level)).length;
  const evidenceBonus = Math.min(22, evidence.length * 4 + strongEvidence * 4);
  const contradictionPenalty = Math.min(28, contradicted * 14);
  const missingPenalty = Math.min(18, missing.length * 3 + unsupported * 5);
  return Math.max(0, Math.min(100, Math.round(claimBase + evidenceBonus + 8 - contradictionPenalty - missingPenalty)));
}

export function buildMemoCoverageSummary(review: ReviewResult): MemoCoverageSummary {
  const sectionKeys = Object.keys(sectionTitles) as MemoSectionKey[];
  const sections = sectionKeys.map((section_key) => {
    const claims = claimsForSection(review, section_key);
    const evidence_ids = evidenceForSection(review, section_key, claims);
    const missing_information = missingForSection(review, section_key, claims);
    const coverage_score = scoreSection(review, section_key, claims, evidence_ids, missing_information);
    const hasClaimsOrEvidence = claims.length > 0 || evidence_ids.length > 0;
    const status = statusFromScore(coverage_score, hasClaimsOrEvidence);
    const unsupported_claim_ids = claims.filter((claim) => ["insufficient_evidence", "unverifiable", "not_evaluated"].includes(claim.status)).map((claim) => claim.claim_id);
    const contradiction_claim_ids = claims.filter((claim) => claim.status === "contradicted").map((claim) => claim.claim_id);
    return {
      section_key,
      title: sectionTitles[section_key],
      coverage_score,
      status,
      confidence: confidenceFromScore(coverage_score, status),
      related_claim_ids: claims.map((claim) => claim.claim_id),
      evidence_ids,
      unsupported_claim_ids,
      contradiction_claim_ids,
      missing_information,
      explanation: hasClaimsOrEvidence
        ? `${sectionTitles[section_key]} links ${claims.length} claim(s) to ${evidence_ids.length} evidence item(s), with ${unsupported_claim_ids.length} unsupported and ${contradiction_claim_ids.length} contradicted claim(s).`
        : `${sectionTitles[section_key]} is primarily reviewer thesis or AI inference from the packet; no direct evidence IDs are attached to this section.`,
    } satisfies MemoSectionCoverage;
  });

  const average_coverage_score = Math.round(sections.reduce((sum, section) => sum + section.coverage_score, 0) / sections.length);
  const strong_sections = sections.filter((section) => section.status === "strong_evidence").length;
  const mixed_sections = sections.filter((section) => section.status === "mixed_evidence").length;
  const weak_sections = sections.filter((section) => section.status === "weak_evidence").length;
  const inference_only_sections = sections.filter((section) => section.status === "inference_only").length;
  const summary = `${strong_sections} strong, ${mixed_sections} mixed, ${weak_sections} weak, and ${inference_only_sections} inference-only memo section(s). Average section evidence coverage is ${average_coverage_score}/100.`;

  return { average_coverage_score, strong_sections, mixed_sections, weak_sections, inference_only_sections, sections, summary };
}
