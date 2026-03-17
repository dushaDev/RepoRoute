# Repo Route

**Repo Route** is a local and remote Git repository visualizer built with Next.js. It renders an interactive, lane-based commit graph from either a local `.git` folder on your machine or a public GitHub repository URL — no external service or cloud upload required for local mode.

---

## Features

- **Horizontal Lane Graph** — Renders all branches as color-coded, horizontal SVG lanes with full commit history topology
- **Local Folder Analysis** — Runs `git` commands server-side via Node.js; reads directly from your `.git` folder on disk
- **Merge Commit Detection** — Merge commits are rendered as distinct diamond nodes, visually separate from regular commits
- **Pull Request Visualization** — Parses PR metadata from Git commit messages (e.g. `Merge pull request #X from user/branch`) without any API dependency in local mode
- **Merge Flow Lines** — Dashed lines trace the source branch path into the merge point
- **Deleted Branch Reconstruction** — Branches that were merged and deleted are reconstructed as visual lanes with a `del` indicator
- **Interactive Tooltips** — Hover any commit node to see SHA, author, date, message, and for merges: PR number, source branch, and target branch
- **Lane Hover Highlight** — Hover a branch name to highlight its full flow and fade out all others
- **Repository Insights** — Computed stats: unique authors, merge/PR count, top contributor, activity span, date range, and avg commits per branch
- **Zoom Controls** — Horizontal shrink and expand to navigate dense graphs
- **Dark / Light Mode** — Fully themed via shadcn/ui

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Graph Rendering | Custom SVG |
| Git Execution | Node.js `child_process` (server-side) |
| GitHub API | `@octokit/rest` |
| Icons | Lucide React |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/dushadev/RepoRoute.git
cd RepoRoute
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root of the project:

```env
GITHUB_TOKEN=your_github_personal_access_token_here
NEXT_PUBLIC_GITHUB_TOKEN=your_github_personal_access_token_here
```

> **Note:** This is only required for the **GitHub mode** to avoid the public API rate limit (60 req/hr unauthenticated). For **local folder analysis**, no token is needed.

**How to generate a GitHub Personal Access Token:**
1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Set a name and expiry, then select the `repo` scope (read-only access is sufficient)
4. Copy the token and paste it into `.env.local` as shown above

`.env.local` is listed in `.gitignore` — your token will never be committed.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

### Analyze a Local Repository

1. Toggle the mode selector to **Local**
2. Paste the **absolute path** to any Git repository on your machine
   - Example: `C:\Users\you\Projects\my-app`
3. Click **Visualize**

### Analyze a GitHub Repository

1. Toggle the mode selector to **GitHub**
2. Paste a full GitHub URL or shorthand:
   - `https://github.com/facebook/react`
   - `facebook/react`
3. Click **Visualize**

---

## Limitations

- **Local mode** loads up to **5000 commits** and **100 branches**. Repositories larger than this will show partial history only.
- Merge lines for deleted branches are reconstructed from commit message text. Non-standard merge messages (e.g. squash merges, rebases) may not render a source branch line.
- This tool is read-only. It makes no changes to your repository.

---

© 2026 Dushan. All rights reserved. • [Developer Portfolio](https://dushadev.github.io/)
