import { Octokit } from "octokit";

const publicOctokit = new Octokit();
const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const privateOctokit = token ? new Octokit({ auth: token }) : null;

// Track which client we are currently using
let currentOctokit = publicOctokit;

/**
 * Attempts an API call with the public client. If rate-limited, falls back to the private client.
 */
async function fetchWithFallback<T>(apiCall: (client: Octokit) => Promise<T>): Promise<T> {
  try {
    return await apiCall(currentOctokit);
  } catch (error: any) {
    // If we hit a rate limit on the public client, and we have a private token, switch over
    if ((error.status === 403 || error.status === 429) && currentOctokit === publicOctokit && privateOctokit) {
      console.warn("Public API rate limit hit. Switching to authenticated token...");
      currentOctokit = privateOctokit;
      return await apiCall(currentOctokit); // Retry with private token
    }
    throw error;
  }
}

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
}

export interface GitBranch {
  name: string;
  commit: string;
}

export interface RepoData {
  owner: string;
  repo: string;
  branches: GitBranch[];
  commits: GitCommit[];
}

/**
 * Parses a GitHub URL to extract owner and repo name.
 * Supports: 
 * - https://github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubUrl(url: string) {
  const cleanUrl = url.trim().replace(/\/$/, "");

  // check if it's owner/repo
  if (cleanUrl.split("/").length === 2 && !cleanUrl.includes("github.com")) {
    const [owner, repo] = cleanUrl.split("/");
    return { owner, repo };
  }

  try {
    const urlObj = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`);
    if (urlObj.hostname === "github.com") {
      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] };
      }
    }
  } catch (e) {
    // fall back to regex if URL parser fails
  }

  const regex = /github\.com\/([^/]+)\/([^/]+)/;
  const match = cleanUrl.match(regex);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  return null;
}

export async function fetchRepoData(urlOrPath: string): Promise<RepoData> {
  const ownerRepo = parseGitHubUrl(urlOrPath);
  if (!ownerRepo) {
    throw new Error("Invalid GitHub URL or path. Please use 'owner/repo' or a full GitHub URL.");
  }

  const { owner, repo } = ownerRepo;

  try {
    // 1. Fetch branches with a timeout to prevent hanging
    const branchesPromise = fetchWithFallback(client => client.rest.repos.listBranches({
      owner,
      repo,
      per_page: 50, // Fetch up to 50 branches
    }));

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. GitHub API might be slow or blocked.")), 10000)
    );

    const branchesResponse = (await Promise.race([branchesPromise, timeoutPromise])) as any;

    const branches: GitBranch[] = branchesResponse.data.map((b: any) => ({
      name: b.name,
      commit: b.commit.sha,
    }));

    // 2. Fetch commits from top branches
    const allCommitsMap = new Map<string, GitCommit>();

    // Prioritize the default branch or main/master so they are always fetched
    branches.sort((a, b) => {
      const isAMain = a.name === "main" || a.name === "master";
      const isBMain = b.name === "main" || b.name === "master";
      if (isAMain && !isBMain) return -1;
      if (!isAMain && isBMain) return 1;
      return 0;
    });

    const topBranches = branches.slice(0, 50);

    for (const branch of topBranches) {
      try {
        const commitsPromise = fetchWithFallback(client => client.rest.repos.listCommits({
          owner,
          repo,
          sha: branch.name,
          per_page: 100, // Fetch up to 100 commits to ensure full tree mapping
        }));

        const branchCommitsResponse = (await Promise.race([commitsPromise, timeoutPromise])) as any;

        branchCommitsResponse.data.forEach((c: any) => {
          if (!allCommitsMap.has(c.sha)) {
            allCommitsMap.set(c.sha, {
              sha: c.sha,
              message: c.commit.message,
              author: c.commit.author?.name || "Unknown",
              date: c.commit.author?.date || "",
              parents: c.parents.map((p: any) => p.sha),
            });
          }
        });

        if (allCommitsMap.size > 2000) break;
      } catch (e: any) {
        if (e.status === 403 || e.status === 429) {
          console.error("Rate limit hit during branch fetch. Stopping additional fetches.");
          break; // Stop trying other branches if we hit the limit
        }
        console.warn(`Failed to fetch commits for branch ${branch.name}:`, e);
      }
    }

    // Sort all collected commits by date descending (latest first)
    const commits = Array.from(allCommitsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      owner,
      repo,
      branches,
      commits,
    };
  } catch (error: any) {
    console.error("Error fetching repo data:", error);

    // Check if the repo exists or is valid
    if (error.status === 404) {
      throw new Error("Repository not found. Please check if the link is valid or if the repository is private.");
    }

    // Check if all tokens are exhausted
    if (error.status === 403 || error.status === 429) {
      throw new Error("GitHub API rate limit reached. Please check back in 1 hour or add a fresh token.");
    }

    throw new Error(error.message || "Failed to fetch repository data.");
  }
}
