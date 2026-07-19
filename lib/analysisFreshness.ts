import type { ReviewResult } from "./types";

export type AnalysisFreshnessStatus = "fresh" | "refresh_recommended" | "never_refreshed_after_manual_edits";

export interface AnalysisFreshness {
  status: AnalysisFreshnessStatus;
  latest_manual_action_at?: string;
  latest_refresh_at?: string;
  manual_action_count: number;
  summary: string;
}

function eventTime(text: string): string | undefined {
  return text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/u)?.[0];
}

function maxIso(values: Array<string | undefined>) {
  const valid = values.filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)));
  if (!valid.length) return undefined;
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

export function assessAnalysisFreshness(review: ReviewResult): AnalysisFreshness {
  const manualTimes = review.claims.flatMap((claim) => [
    ...(claim.reviewer_overrides ?? []).map((override) => override.updated_at),
    ...claim.reviewer_notes
      .filter((note) => note.startsWith("Reviewer-added claim") || note.startsWith("Reviewer-edited claim") || note.startsWith("Reviewer linked evidence") || note.startsWith("Reviewer unlinked evidence") || note.startsWith("Reviewer override"))
      .map(eventTime),
  ]);
  const manual_action_count = manualTimes.filter(Boolean).length;
  const latest_manual_action_at = maxIso(manualTimes);
  const latest_refresh_at = maxIso(review.provenance_log.filter((entry) => entry.includes("refreshed derived analysis")).map(eventTime));

  if (!manual_action_count) {
    return { status: "fresh", latest_manual_action_at, latest_refresh_at, manual_action_count, summary: "No manual graph edits have been recorded after deterministic analysis." };
  }
  if (!latest_refresh_at) {
    return { status: "never_refreshed_after_manual_edits", latest_manual_action_at, latest_refresh_at, manual_action_count, summary: `${manual_action_count} manual action(s) are recorded and derived analysis has not been refreshed afterward.` };
  }
  if (latest_manual_action_at && Date.parse(latest_manual_action_at) > Date.parse(latest_refresh_at)) {
    return { status: "refresh_recommended", latest_manual_action_at, latest_refresh_at, manual_action_count, summary: "Manual edits were made after the last refresh; refresh derived analysis to update scorecards, recommendation, and memo." };
  }
  return { status: "fresh", latest_manual_action_at, latest_refresh_at, manual_action_count, summary: "Derived analysis is fresh relative to the latest timestamped manual action." };
}
