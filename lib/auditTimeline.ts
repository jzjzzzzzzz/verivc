import type { Claim, Evidence, ReviewResult } from "./types";

export type AuditTimelineEventType = "intake" | "analysis" | "claim_override" | "claim_edit" | "evidence_link" | "refresh" | "exportable_audit";
export type AuditTimelineSeverity = "info" | "human_action" | "system_action" | "risk_relevant";

export interface AuditTimelineEvent {
  event_id: string;
  event_type: AuditTimelineEventType;
  severity: AuditTimelineSeverity;
  title: string;
  description: string;
  occurred_at?: string;
  claim_ids: string[];
  evidence_ids: string[];
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function eventTime(text: string): string | undefined {
  return text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/u)?.[0];
}

function idsFrom(text: string, prefix: "CL" | "EV") {
  const regex = prefix === "CL" ? /CL(?:-REV)?-\d{3}/gu : /EV-[A-Z0-9-]+/gu;
  return unique(text.match(regex) ?? []);
}

function claimReviewerEvents(claims: Claim[]): AuditTimelineEvent[] {
  const events: AuditTimelineEvent[] = [];
  for (const claim of claims) {
    for (const override of claim.reviewer_overrides ?? []) {
      events.push({
        event_id: `audit-override-${override.override_id}`,
        event_type: "claim_override",
        severity: "human_action",
        title: `Reviewer override on ${claim.claim_id}`,
        description: `${override.previous_status}/${override.previous_confidence} → ${override.new_status}/${override.new_confidence}. ${override.note}`,
        occurred_at: override.updated_at,
        claim_ids: [claim.claim_id],
        evidence_ids: unique([...claim.supporting_evidence_ids, ...claim.contradicting_evidence_ids]),
      });
    }
    for (const note of claim.reviewer_notes) {
      if (note.startsWith("Reviewer-added claim") || note.startsWith("Reviewer-edited claim")) {
        events.push({
          event_id: `audit-claim-${claim.claim_id}-${events.length + 1}`,
          event_type: "claim_edit",
          severity: "human_action",
          title: note.startsWith("Reviewer-added claim") ? `Reviewer added ${claim.claim_id}` : `Reviewer edited ${claim.claim_id}`,
          description: note,
          occurred_at: eventTime(note),
          claim_ids: [claim.claim_id],
          evidence_ids: unique([...claim.supporting_evidence_ids, ...claim.contradicting_evidence_ids]),
        });
      }
      if (note.startsWith("Reviewer linked evidence") || note.startsWith("Reviewer unlinked evidence")) {
        events.push({
          event_id: `audit-link-${claim.claim_id}-${events.length + 1}`,
          event_type: "evidence_link",
          severity: "human_action",
          title: note.startsWith("Reviewer linked evidence") ? "Reviewer linked evidence" : "Reviewer unlinked evidence",
          description: note,
          occurred_at: eventTime(note),
          claim_ids: unique([claim.claim_id, ...idsFrom(note, "CL")]),
          evidence_ids: idsFrom(note, "EV"),
        });
      }
    }
  }
  return events;
}

function evidenceCaptureEvents(evidence: Evidence[]): AuditTimelineEvent[] {
  return evidence.slice(0, 12).map((item) => ({
    event_id: `audit-evidence-${item.evidence_id}`,
    event_type: "analysis" as const,
    severity: item.contradicts_claim_ids.length ? "risk_relevant" as const : "info" as const,
    title: `Evidence captured: ${item.evidence_id}`,
    description: `${item.title} · ${item.source_type} · reliability ${item.reliability_level}.`,
    occurred_at: item.captured_at,
    claim_ids: unique([...item.supports_claim_ids, ...item.contradicts_claim_ids]),
    evidence_ids: [item.evidence_id],
  }));
}

function provenanceEvents(review: ReviewResult): AuditTimelineEvent[] {
  return review.provenance_log.map((entry, index) => {
    const isRefresh = entry.includes("refreshed derived analysis");
    return {
      event_id: `audit-provenance-${index + 1}`,
      event_type: isRefresh ? "refresh" : index === 0 ? "intake" : "analysis",
      severity: isRefresh ? "system_action" : "info",
      title: isRefresh ? "Derived analysis refreshed" : index === 0 ? "Startup intake captured" : "Review pipeline step",
      description: entry,
      occurred_at: eventTime(entry) ?? (index === 0 ? review.created_at : undefined),
      claim_ids: idsFrom(entry, "CL"),
      evidence_ids: idsFrom(entry, "EV"),
    } satisfies AuditTimelineEvent;
  });
}

function sortEvents(events: AuditTimelineEvent[]) {
  return events.sort((a, b) => {
    if (a.event_type === "exportable_audit" && b.event_type !== "exportable_audit") return 1;
    if (b.event_type === "exportable_audit" && a.event_type !== "exportable_audit") return -1;
    const aTime = a.occurred_at ? Date.parse(a.occurred_at) : Number.MAX_SAFE_INTEGER;
    const bTime = b.occurred_at ? Date.parse(b.occurred_at) : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;
    return a.event_id.localeCompare(b.event_id);
  });
}

export function buildAuditTimeline(review: ReviewResult): AuditTimelineEvent[] {
  const events: AuditTimelineEvent[] = [
    ...provenanceEvents(review),
    ...evidenceCaptureEvents(review.evidence),
    ...claimReviewerEvents(review.claims),
    {
      event_id: "audit-exportable-package",
      event_type: "exportable_audit",
      severity: "system_action",
      title: "Audit package is exportable",
      description: `Current review contains ${review.claims.length} claims, ${review.evidence.length} evidence items, ${review.red_flags.length} red flags, and recommendation ${review.recommendation.state}.`,
      occurred_at: undefined,
      claim_ids: [],
      evidence_ids: [],
    },
  ];
  return sortEvents(events).map((event, index) => ({ ...event, event_id: `${String(index + 1).padStart(3, "0")}-${event.event_id}` }));
}

export function summarizeAuditTimeline(events: AuditTimelineEvent[]) {
  const human_actions = events.filter((event) => event.severity === "human_action").length;
  const risk_relevant = events.filter((event) => event.severity === "risk_relevant").length;
  const refreshes = events.filter((event) => event.event_type === "refresh").length;
  return {
    total_events: events.length,
    human_actions,
    risk_relevant,
    refreshes,
    summary: `${events.length} audit event(s), ${human_actions} human action(s), ${risk_relevant} risk-relevant evidence event(s), ${refreshes} refresh action(s).`,
  };
}
