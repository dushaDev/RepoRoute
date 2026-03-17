import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { GitBranch, GitCommit, RepoData } from "./github";

const execAsync = promisify(exec);

export async function fetchLocalRepoData(repoPath: string): Promise<RepoData> {
  const absolutePath = path.resolve(repoPath);

  // Check if directory exists and has a .git folder
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Directory not found: ${absolutePath}`);
  }
  
  if (!fs.existsSync(path.join(absolutePath, ".git"))) {
    throw new Error(`Not a git repository (or any of the parent directories): .git folder not found in ${absolutePath}`);
  }

  // 50MB buffer to handle very large git log outputs
  const options = { cwd: absolutePath, maxBuffer: 1024 * 1024 * 50 };

  try {
    // 1. Fetch branches
    // `git branch -a` lists local and remote-tracking branches.
    const { stdout: branchesOut } = await execAsync(`git branch -a --format="%(refname:short)|%(objectname)"`, options);
    
    const branchesMap = new Map<string, string>();
    // Separate local and remote branches to prefer local HEAD over remote
    const localBranches = new Map<string, string>();
    const remoteBranches = new Map<string, string>();

    branchesOut
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .forEach((line) => {
        let [name, commit] = line.split("|");
        name = name.trim();
        commit = commit?.trim() || "";

        // Remove 'HEAD' pointer refs if they appear
        if (name === "HEAD" || name.endsWith("/HEAD")) return;

        if (name.startsWith("origin/")) {
          // Remote tracking branch — store without prefix
          const stripped = name.substring(7);
          remoteBranches.set(stripped, commit);
        } else {
          // Local branch — these take priority
          localBranches.set(name, commit);
        }
      });

    // Merge: local branch wins, then fill in any remote-only branches
    localBranches.forEach((commit, name) => branchesMap.set(name, commit));
    remoteBranches.forEach((commit, name) => {
      if (!branchesMap.has(name)) {
        branchesMap.set(name, commit);
      }
    });

    const branches: GitBranch[] = Array.from(branchesMap.entries()).map(([name, commit]) => ({ name, commit }));

    // 2. Fetch commits
    // formatting log with a unique delimiter |~| to easily parse fields out
    const format = `%H|~|%s|~|%an|~|%aI|~|%P`;
    
    // We'll increase the commit limit to 5000 for local repos so we get a massive, ultra-detailed view
    const { stdout: commitsOut } = await execAsync(`git log --all --format="${format}" -n 5000`, options);
    
    const commits: GitCommit[] = commitsOut
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [sha, message, author, date, parentsStr] = line.split("|~|");
        const parents = parentsStr ? parentsStr.trim().split(" ") : [];
        const isMerge = parents.length > 1;
        let prNumber;
        let sourceBranch;

        if (isMerge) {
           const prMatch = message.match(/Merge pull request #(\d+) from (.*)/);
           if (prMatch) {
               prNumber = prMatch[1];
               sourceBranch = prMatch[2];
           } else {
               const branchMatch = message.match(/Merge branch '(.*)'/);
               if (branchMatch) {
                   sourceBranch = branchMatch[1];
               }
           }
        }

        return {
          sha: sha?.trim() || "",
          message: message?.trim() || "",
          author: author?.trim() || "",
          date: date?.trim() || "",
          parents,
          isMerge,
          prNumber,
          sourceBranch,
        };
      });

    // --- Post-processing: match merge parent SHAs to branch names ---
    // `git branch -a` only returns the current HEAD of each branch.
    // But a merge commit's 2nd parent is the SHA at the time of merge, 
    // which may differ from the current HEAD if the branch advanced.
    // We build a direct SHA → branchName reverse map from the branch HEAD list,
    // and also scan through the full commit ancestors list to widen the coverage.
    const shaToBranch = new Map<string, string>();
    branchesMap.forEach((sha, name) => {
      shaToBranch.set(sha, name);
    });

    commits.forEach(commit => {
      if (commit.isMerge && !commit.sourceBranch && commit.parents.length > 1) {
        const pSha = commit.parents[1];
        const matchedBranch = shaToBranch.get(pSha);
        if (matchedBranch) {
          commit.sourceBranch = matchedBranch;
        }
      }
    });


    const repoName = path.basename(absolutePath);

    // Limit branches to 100. Any more than 100 lanes can severely lag SVG rendering and cause visual clutter
    return {
      owner: "local",
      repo: repoName,
      branches: branches.slice(0, 100),
      commits,
    };
  } catch (error: any) {
    console.error("Error executing git command:", error);
    throw new Error(`Failed to parse local git repository: ${error.message}`);
  }
}
