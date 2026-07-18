import { assertReviewResult, type ReviewResult } from "./types";
import { slugify } from "./engine";

export const auditPackageSchemaVersion = "verivc.review.v1" as const;

export interface AuditPackage {
  schema_version: typeof auditPackageSchemaVersion;
  exported_at: string;
  review: ReviewResult;
}

export function createAuditPackage(review: ReviewResult, exportedAt = new Date().toISOString()): AuditPackage {
  return {
    schema_version: auditPackageSchemaVersion,
    exported_at: exportedAt,
    review: assertReviewResult(review),
  };
}

export function serializeAuditPackage(review: ReviewResult): string {
  return JSON.stringify(createAuditPackage(review), null, 2);
}

export function auditPackageFileName(review: ReviewResult): string {
  return `${slugify(review.profile.company_name)}-verivc-audit-package.json`;
}

function hasRecordShape(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseAuditPackageJson(text: string): AuditPackage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Audit package is not valid JSON.");
  }

  if (!hasRecordShape(parsed)) {
    throw new Error("Audit package must be a JSON object.");
  }
  if (parsed.schema_version !== auditPackageSchemaVersion) {
    throw new Error(`Unsupported audit package schema: ${String(parsed.schema_version || "missing")}.`);
  }
  if (typeof parsed.exported_at !== "string" || !parsed.exported_at) {
    throw new Error("Audit package is missing exported_at.");
  }
  if (!hasRecordShape(parsed.review)) {
    throw new Error("Audit package is missing review payload.");
  }

  return {
    schema_version: auditPackageSchemaVersion,
    exported_at: parsed.exported_at,
    review: assertReviewResult(parsed.review as ReviewResult),
  };
}
