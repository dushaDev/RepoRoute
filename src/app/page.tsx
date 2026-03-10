"use client";

import { useState } from "react";
import { RepoSearch } from "@/components/RepoSearch";
import { CommitGraph } from "@/components/CommitGraph";
import { fetchRepoData, RepoData } from "@/lib/github";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, History, AlertCircle, Info, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRepoData(url);
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
                Connect your engineering team's history. Paste a public GitHub repository URL or enter "owner/repo" to visualize its architecture.
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-5xl font-black tracking-tighter text-foreground">{repoData.repo}</h2>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">Public</span>
                </div>
                <p className="text-xl text-muted-foreground font-medium flex items-center gap-2">
                  <span className="opacity-50">by</span>
                  <span className="hover:text-primary cursor-default transition-colors">{repoData.owner}</span>
                </p>
              </div>
              <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-2xl border backdrop-blur-sm self-start md:self-auto">
                <div className="text-center group">
                  <p className="text-2xl font-black tracking-tighter group-hover:text-primary transition-colors">{repoData.commits.length}</p>
                  <p className="text-[10px] uppercase font-black tracking-tighter text-muted-foreground/60">Commits</p>
                </div>
                <div className="h-8 w-[2px] bg-border transition-transform scale-y-110"></div>
                <div className="text-center group">
                  <p className="text-2xl font-black tracking-tighter group-hover:text-primary transition-colors">{repoData.branches.length}</p>
                  <p className="text-[10px] uppercase font-black tracking-tighter text-muted-foreground/60">Branches</p>
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
                    Insight Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1 group">
                      <p className="text-[11px] uppercase font-black tracking-widest text-muted-foreground/60 group-hover:text-primary transition-colors">Endpoint Status</p>
                      <p className="text-lg font-bold text-foreground">API Sync Operational</p>
                    </div>
                    <div className="space-y-1 group">
                      <p className="text-[11px] uppercase font-black tracking-widest text-muted-foreground/60 group-hover:text-primary transition-colors">Data Freshness</p>
                      <p className="text-lg font-bold text-foreground">Real-time Fetch</p>
                    </div>
                    <div className="space-y-1 group">
                      <p className="text-[11px] uppercase font-black tracking-widest text-muted-foreground/60 group-hover:text-primary transition-colors">Visualization Mode</p>
                      <p className="text-lg font-bold text-foreground">Horizontal Lane Flow</p>
                    </div>
                    <div className="space-y-1 group">
                      <p className="text-[11px] uppercase font-black tracking-widest text-muted-foreground/60 group-hover:text-primary transition-colors">Structure Complexity</p>
                      <p className="text-lg font-bold text-foreground">Adaptive Mapping</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-lg rounded-2xl overflow-hidden bg-primary/5 border-primary/10">
                <CardHeader className="p-5 border-b bg-primary/5">
                  <CardTitle className="text-lg font-bold">Deep Dive</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-6">
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
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

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
