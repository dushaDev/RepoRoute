# Repo Route 🗺️

**Repo Route** is an interactive, horizontal Git graph visualization tool built to explore the history of public GitHub repositories in an elegant, ultra-dense format.

Watch the repository's architecture unfold with up to 50 active branches and 2,000 commits mapped together in a single breathtaking scrollable view!

---

## 🚀 Features
- **Ultra-Compact Visualization**: A custom SVG-rendered timeline squeezed for maximum data density. See hundreds of commits without losing track of the bigger picture.
- **Smart Branch Tracking**: Dynamically tracks branch divergence, merges, and traces paths back to the `main` or `master` trunk.
- **Rich Interactive Tooltips**: Hover over any commit node to reveal a beautiful glassmorphism popup containing the commit SHA, author, date, and full commit message.
- **Lane Highlighting**: Hover over a branch name in the sidebar to instantly highlight its entire flow line while fading out the rest of the noise.
- **Smart Data Fetching**: By default, it uses the public GitHub API to fetch data instantly.
- **Dark Mode by Default**: A premium, sleek aesthetic designed to be easy on the eyes.

## 🛠️ Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & shadcn/ui
- **Icons**: Lucide React
- **Data Source**: GitHub REST API (`@octokit/rest`)

## 💻 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/dushadev/RepoRoute.git
cd RepoRoute
npm install
```

### 2. (Optional but Highly Recommended) Add GitHub Token
To visualize massive repositories (like react or next.js) without hitting the public GitHub API rate limit (60 requests/hour), you should add a Personal Access Token.

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_GITHUB_TOKEN=your_github_personal_access_token_here
```
*Note: `.env.local` is ignored by git, so your token stays safe on your machine.*

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📸 Usage
1. Enter any public GitHub repository URL (e.g., `https://github.com/facebook/react`) or shorthand (e.g., `facebook/react`) into the search bar.
2. Click **Visualize**.
3. Scroll horizontally to explore the timeline!

---
© 2026 Dushan. All rights reserved. • [Developer Portfolio](https://dushadev.github.io/)
