"use client";

import { useState } from "react";
import { RepoSearch } from "@/components/RepoSearch";
import { CommitGraph } from "@/components/CommitGraph";
import { fetchRepoData, RepoData } from "@/lib/github";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, History, AlertCircle, Info, ExternalLink, FolderGit2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (input: string, mode: "github" | "local" = "github") => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (mode === "github") {
        data = await fetchRepoData(input);
      } else {
        const res = await fetch(`/api/local-repo?path=${encodeURIComponent(input)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${res.status}`);
        }
        data = await res.json();
      }
      setRepoData(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setRepoData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/10 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md shadow-sm">
        <div className="w-full px-8 md:px-12 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 group">
            <div className="bg-primary shadow-lg shadow-primary/20 p-2.5 rounded-xl transition-transform group-hover:scale-110">
              <History className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Repo Route</h1>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider opacity-70">Interactive Git Visualization</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <RepoSearch onSearch={handleSearch} isLoading={loading} />
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="w-full px-8 md:px-12 py-8 space-y-8">
        {!repoData && !error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
              <button
                onClick={() => document.getElementById('repo-search-input')?.focus()}
                className="bg-card relative border-2 border-dashed border-muted-foreground/20 rounded-full p-16 shadow-2xl transition-all hover:border-primary/50 hover:shadow-primary/20 group block cursor-pointer"
                aria-label="Focus search input"
              >
                <Github className="h-32 w-32 text-muted-foreground/20 group-hover:text-primary transition-colors" />
              </button>
            </div>
            <div className="max-w-xl space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Ready to explore?</h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                Connect your engineering team's history. Paste a public GitHub repository URL or select your local project folder to visualize its architecture.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <div className="h-16 w-16 border-4 border-primary/20 rounded-full animate-ping absolute" />
              <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin relative" />
            </div>
            <p className="text-xl font-semibold tracking-wide text-foreground animate-pulse">Analyzing repository structure...</p>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto py-12">
            <Alert variant="destructive" className="border-2 shadow-xl bg-destructive/5">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-lg font-bold">Visualization Failed</AlertTitle>
              <AlertDescription className="text-base font-medium opacity-90">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {repoData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
            <div className="flex items-center gap-4 flex-wrap pb-3 border-b">
              {/* Repo name + badge */}
              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-foreground truncate">{repoData.repo}</h2>
                {repoData.owner === "local" ? (
                  <span className="shrink-0 px-2 py-0.5 bg-secondary/20 text-secondary-foreground text-[9px] font-black uppercase tracking-widest rounded-full border border-border">Local</span>
                ) : (
                  <span className="shrink-0 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full border border-primary/20">Public</span>
                )}
                <span className="text-sm text-muted-foreground/50 font-medium">by <span className="text-muted-foreground">{repoData.owner}</span></span>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Stats inline */}
              <div className="flex items-center gap-3 text-sm bg-muted/40 rounded-xl px-4 py-2 border">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-foreground">{repoData.commits.length.toLocaleString()}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Commits</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-foreground">{repoData.branches.length}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">Branches</span>
                </div>
              </div>
            </div>

            <Card className="overflow-hidden border-2 shadow-2xl rounded-3xl group bg-card transition-all hover:shadow-primary/5">
              <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between p-6">
                <div>
                  <CardTitle className="text-xl flex items-center gap-3 font-bold">
                    <History className="h-6 w-6 text-primary" />
                    Interactive Flow Diagram
                  </CardTitle>
                  <CardDescription className="text-sm font-medium">Reconstructing branch architecture and evolution</CardDescription>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 bg-background/50 px-3 py-1.5 rounded-lg border shadow-sm">
                  <Info className="h-3 w-3" />
                  Live Preview
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <CommitGraph commits={repoData.commits} branches={repoData.branches} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/10 p-5 border-b">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Repository Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {(() => {
                    const commits = repoData.commits;
                    const branches = repoData.branches;

                    const uniqueAuthors = new Set(commits.map(c => c.author)).size;
                    const mergeCommits = commits.filter(c => c.isMerge).length;
                    const prMerges = commits.filter(c => c.prNumber).length;

                    // Most active contributor
                    const authorCounts = commits.reduce<Record<string, number>>((acc, c) => {
                      acc[c.author] = (acc[c.author] || 0) + 1;
                      return acc;
                    }, {});
                    const topAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];

                    // Date range
                    const dates = commits.map(c => new Date(c.date).getTime()).filter(Boolean);
                    const earliest = dates.length ? new Date(Math.min(...dates)) : null;
                    const latest = dates.length ? new Date(Math.max(...dates)) : null;
                    const daySpan = earliest && latest ? Math.round((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) : 0;

                    const avgCommitsPerBranch = branches.length > 0 ? (commits.length / branches.length).toFixed(1) : '–';

                    const stats = [
                      { label: "Total Commits", value: commits.length.toLocaleString() },
                      { label: "Branches", value: branches.length },
                      { label: "Unique Authors", value: uniqueAuthors },
                      { label: "Merge Commits", value: mergeCommits },
                      { label: "Pull Requests", value: prMerges },
                      { label: "Top Contributor", value: topAuthor ? topAuthor[0] : '–', sub: topAuthor ? `${topAuthor[1]} commits` : '' },
                      { label: "Activity Span", value: `${daySpan} days` },
                      { label: "Avg Commits / Branch", value: avgCommitsPerBranch },
                      { label: "First Commit", value: earliest ? earliest.toLocaleDateString() : '–' },
                      { label: "Latest Commit", value: latest ? latest.toLocaleDateString() : '–' },
                    ];

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                        {stats.map(stat => (
                          <div key={stat.label} className="space-y-0.5 group">
                            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 group-hover:text-primary transition-colors">{stat.label}</p>
                            <p className="text-base font-bold text-foreground truncate">{stat.value}</p>
                            {stat.sub && <p className="text-[10px] text-muted-foreground/50">{stat.sub}</p>}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="border shadow-lg rounded-2xl overflow-hidden bg-primary/5 border-primary/10">
                <CardHeader className="p-5 border-b bg-primary/5">
                  <CardTitle className="text-lg font-bold">Deep Dive</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-6">
                  {repoData.owner === "local" ? (
                    <>
                      <p className="text-muted-foreground text-sm font-medium">Explore the raw repository data directly on your local machine.</p>
                      <div className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-secondary text-secondary-foreground font-bold shadow-lg border shadow-secondary/10">
                        <FolderGit2 className="h-5 w-5" />
                        Local Repository
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-sm font-medium">Explore the raw repository data directly on GitHub for more insights.</p>
                      <a
                        href={`https://github.com/${repoData.owner}/${repoData.repo}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Github className="h-5 w-5" />
                        GitHub Source
                        <ExternalLink className="h-4 w-4 opacity-50" />
                      </a>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Warnings & Tips Section */}
      <section className="border-t bg-muted/10 px-6 md:px-12 py-10 mt-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Info */}
          <div className="flex gap-3 p-4 rounded-2xl border bg-blue-500/5 border-blue-500/20">
            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Info className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-500 mb-1">Note</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For local repos, up to <strong className="text-foreground">100 branches</strong> and <strong className="text-foreground">5000 commits</strong> are visualized. Very large repositories may take a moment to render.
              </p>
            </div>
          </div>

          {/* Data Completeness Warning */}
          <div className="flex gap-3 p-4 rounded-2xl border bg-orange-500/5 border-orange-500/20">
            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <svg className="h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-orange-500 mb-1">Partial Data</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This visualization shows a <strong className="text-foreground">subset of your repository</strong>. Commits beyond the 5000 limit or branches beyond 100 are <strong className="text-foreground">not included</strong>. Stats and graphs may not reflect the full project history.
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20">
            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <svg className="h-4 w-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-500 mb-1">Warning</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Merge lines for <strong className="text-foreground">deleted branches</strong> are reconstructed from commit message text only. They may not appear if the merge used a non-standard message format.
              </p>
            </div>
          </div>

          {/* Caution / Privacy */}
          <div className="flex gap-3 p-4 rounded-2xl border bg-red-500/5 border-red-500/20">
            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-red-500 mb-1">Caution</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Local analysis runs entirely on <strong className="text-foreground">your machine</strong>. No repository data is uploaded or shared. Only metadata is read from the <code className="font-mono text-[10px] bg-muted px-1 rounded">.git</code> folder.
              </p>
            </div>
          </div>

        </div>
      </section>

      <footer className="border-t py-12 mt-20 bg-muted/20">
        <div className="w-full px-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-30 select-none">
            <History className="h-5 w-5" />
            <span className="font-bold tracking-tighter text-lg">Repo Route</span>
          </div>
          <div className="max-w-md mx-auto h-px bg-border/50" />
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm font-bold tracking-tight opacity-70">
            <p className="text-muted-foreground">© {new Date().getFullYear()} Dushan. All rights reserved.</p>
            <span className="hidden md:inline text-muted-foreground/30">•</span>
            <a href="https://dushadev.github.io/" target="_blank" rel="noreferrer" className="text-primary hover:underline underline-offset-4 transition-all">
              developer portfolio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
