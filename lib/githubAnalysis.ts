export interface GithubRepoRef {
  owner: string;
  repo: string;
}

export interface GithubSnapshot {
  owner: string;
  repo: string;
  htmlUrl: string;
  description: string;
  defaultBranch: string;
  visibility: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  primaryLanguage: string;
  license: string;
  readme: "present" | "missing" | "unknown";
  recentCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  contributorsReturned: number;
  languageMix: Array<{ language: string; bytes: number; percentage: number }>;
  capturedAt: string;
  limitations: string[];
}

export interface GithubAnalysisOptions {
  timeoutMs?: number;
  now?: string;
  fetchImpl?: typeof fetch;
}

export function parseGithubRepoUrl(value: string): GithubRepoRef | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2].replace(/\.git$/i, "") };

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
  } catch {
    return null;
  }
}

function apiUrl(ref: GithubRepoRef, path = "") {
  return `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}${path}`;
}

async function fetchJson<T>(url: string, signal: AbortSignal, fetchImpl: typeof fetch): Promise<T | null> {
  const response = await fetchImpl(url, {
    signal,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub request failed with ${response.status}.`);
  return (await response.json()) as T;
}

function languageMix(languages: Record<string, number> | null): GithubSnapshot["languageMix"] {
  if (!languages) return [];
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0) || 1;
  return entries.slice(0, 6).map(([language, bytes]) => ({ language, bytes, percentage: Math.round((bytes / total) * 100) }));
}

export function formatGithubSnapshot(snapshot: GithubSnapshot): string {
  const languages = snapshot.languageMix.length
    ? snapshot.languageMix.map((item) => `${item.language} ${item.percentage}%`).join(", ")
    : "Unavailable";
  const recentCommit = snapshot.recentCommit
    ? `${snapshot.recentCommit.date.slice(0, 10)} by ${snapshot.recentCommit.author}: ${snapshot.recentCommit.message.slice(0, 120)}`
    : "Unavailable";
  return [
    `GitHub public snapshot for ${snapshot.owner}/${snapshot.repo} captured at ${snapshot.capturedAt}.`,
    `Repository: ${snapshot.htmlUrl}. Visibility: ${snapshot.visibility}. Description: ${snapshot.description || "No description provided"}.`,
    `Stars: ${snapshot.stars}. Forks: ${snapshot.forks}. Watchers: ${snapshot.watchers}. Open issues/PRs: ${snapshot.openIssues}.`,
    `Default branch: ${snapshot.defaultBranch}. Primary language: ${snapshot.primaryLanguage || "Unavailable"}. Language mix: ${languages}.`,
    `README: ${snapshot.readme}. License: ${snapshot.license}. Contributors returned by public API: ${snapshot.contributorsReturned}.`,
    `Recent commit: ${recentCommit}.`,
    `Limitations: ${snapshot.limitations.join(" ")}`,
  ].join("\n");
}

export async function fetchGithubSnapshotFromUrl(url: string, options: GithubAnalysisOptions = {}): Promise<GithubSnapshot> {
  const ref = parseGithubRepoUrl(url);
  if (!ref) throw new Error("Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo.");

  const timeoutMs = options.timeoutMs ?? 8000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    type RepoResponse = {
      html_url?: string;
      description?: string | null;
      default_branch?: string;
      visibility?: string;
      stargazers_count?: number;
      forks_count?: number;
      watchers_count?: number;
      open_issues_count?: number;
      language?: string | null;
      license?: { spdx_id?: string | null; name?: string | null } | null;
    };
    type CommitResponse = Array<{ sha?: string; commit?: { message?: string; author?: { name?: string; date?: string } } }>;

    const [repo, languages, commits, contributors, readme] = await Promise.all([
      fetchJson<RepoResponse>(apiUrl(ref), controller.signal, fetchImpl),
      fetchJson<Record<string, number>>(apiUrl(ref, "/languages"), controller.signal, fetchImpl),
      fetchJson<CommitResponse>(apiUrl(ref, "/commits?per_page=1"), controller.signal, fetchImpl),
      fetchJson<unknown[]>(apiUrl(ref, "/contributors?per_page=5"), controller.signal, fetchImpl),
      fetchJson<unknown>(apiUrl(ref, "/readme"), controller.signal, fetchImpl),
    ]);

    if (!repo) throw new Error("GitHub repository was not found or is not public.");
    const latest = commits?.[0];
    return {
      owner: ref.owner,
      repo: ref.repo,
      htmlUrl: repo.html_url ?? `https://github.com/${ref.owner}/${ref.repo}`,
      description: repo.description ?? "",
      defaultBranch: repo.default_branch ?? "unknown",
      visibility: repo.visibility ?? "public",
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      watchers: repo.watchers_count ?? 0,
      openIssues: repo.open_issues_count ?? 0,
      primaryLanguage: repo.language ?? "",
      license: repo.license?.spdx_id || repo.license?.name || "missing or not detected",
      readme: readme ? "present" : "missing",
      recentCommit: latest
        ? {
            sha: latest.sha?.slice(0, 7) ?? "unknown",
            message: latest.commit?.message?.split("\n")[0] ?? "No commit message",
            author: latest.commit?.author?.name ?? "unknown",
            date: latest.commit?.author?.date ?? "unknown",
          }
        : undefined,
      contributorsReturned: contributors?.length ?? 0,
      languageMix: languageMix(languages),
      capturedAt: options.now ?? new Date().toISOString(),
      limitations: [
        "Unauthenticated public GitHub API snapshot; private repos, monorepos, mirrors, and rate limits may hide relevant work.",
        "Repository activity does not prove product quality, security, customer adoption, ownership, or production readiness.",
      ],
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("GitHub analysis timed out. Keep the URL captured or paste a repository snapshot manually.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
