import { parseAuditPackageJson, serializeAuditPackage, type AuditPackage } from "./auditPackage";
import type { ReviewResult } from "./types";

export const sharePayloadPrefix = "verivc-share:v1:" as const;
export const maxSharePayloadCharacters = 1_500_000;

function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(payload: string): string {
  if (!/^[A-Za-z0-9_-]+$/u.test(payload)) {
    throw new Error("Share payload contains characters outside the VeriVC base64url format.");
  }
  const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("Share payload is not valid base64url data.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Share payload is not valid UTF-8 JSON.");
  }
}

export function createSharePayload(review: ReviewResult): string {
  const encoded = encodeBase64Url(serializeAuditPackage(review));
  const payload = `${sharePayloadPrefix}${encoded}`;
  if (payload.length > maxSharePayloadCharacters) {
    throw new Error(`Share payload is too large (${payload.length.toLocaleString()} characters). Export JSON instead.`);
  }
  return payload;
}

export function parseSharePayload(text: string): AuditPackage {
  const trimmed = text.trim();
  if (!trimmed.startsWith(sharePayloadPrefix)) {
    throw new Error("Share payload must start with verivc-share:v1:.");
  }
  if (trimmed.length > maxSharePayloadCharacters) {
    throw new Error(`Share payload is too large (${trimmed.length.toLocaleString()} characters). Import JSON instead.`);
  }
  const encoded = trimmed.slice(sharePayloadPrefix.length);
  if (!encoded) {
    throw new Error("Share payload is missing encoded review data.");
  }
  return parseAuditPackageJson(decodeBase64Url(encoded));
}

export function sharePayloadSummary(payload: string): string {
  const kilobytes = Math.max(1, Math.round(new TextEncoder().encode(payload).length / 1024));
  return `${payload.length.toLocaleString()} characters · about ${kilobytes.toLocaleString()} KB · local handoff only`;
}
