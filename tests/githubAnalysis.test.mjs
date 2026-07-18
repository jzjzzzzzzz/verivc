import assert from "node:assert/strict";
import test from "node:test";
import { formatGithubSnapshot, parseGithubRepoUrl } from "../lib/githubAnalysis.ts";

test("GitHub repository URLs are parsed conservatively", () => {
  assert.deepEqual(parseGithubRepoUrl("https://github.com/openai/codex"), { owner: "openai", repo: "codex" });
  assert.deepEqual(parseGithubRepoUrl("github.com/acme/startup.git"), { owner: "acme", repo: "startup" });
  assert.deepEqual(parseGithubRepoUrl("git@github.com:acme/startup.git"), { owner: "acme", repo: "startup" });
  assert.equal(parseGithubRepoUrl("https://gitlab.com/acme/startup"), null);
  assert.equal(parseGithubRepoUrl("https://github.com/acme"), null);
});

test("GitHub snapshots format as provenance-preserving evidence", () => {
  const formatted = formatGithubSnapshot({
    owner: "acme",
    repo: "startup",
    htmlUrl: "https://github.com/acme/startup",
    description: "Evidence automation",
    defaultBranch: "main",
    visibility: "public",
    stars: 12,
    forks: 3,
    watchers: 12,
    openIssues: 4,
    primaryLanguage: "TypeScript",
    license: "MIT",
    readme: "present",
    recentCommit: { sha: "abc1234", message: "Add tests", author: "Dana", date: "2026-07-19T00:00:00Z" },
    contributorsReturned: 2,
    languageMix: [{ language: "TypeScript", bytes: 900, percentage: 90 }, { language: "CSS", bytes: 100, percentage: 10 }],
    capturedAt: "2026-07-19T01:00:00.000Z",
    limitations: ["Public API snapshot.", "Metrics do not prove quality."],
  });
  assert.match(formatted, /GitHub public snapshot for acme\/startup/);
  assert.match(formatted, /Stars: 12/);
  assert.match(formatted, /README: present/);
  assert.match(formatted, /TypeScript 90%/);
  assert.match(formatted, /Metrics do not prove quality/);
});
