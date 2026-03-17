"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, FolderGit2, Github } from "lucide-react";

interface RepoSearchProps {
    onSearch: (input: string, mode: "github" | "local") => void;
    isLoading: boolean;
}

export function RepoSearch({ onSearch, isLoading }: RepoSearchProps) {
    const [inputVal, setInputVal] = useState("");
    const [mode, setMode] = useState<"github" | "local">("github");

    useEffect(() => {
        const savedInput = localStorage.getItem("lastRepoInput");
        const savedMode = localStorage.getItem("lastRepoMode") as "github" | "local";
        if (savedInput) setInputVal(savedInput);
        if (savedMode) setMode(savedMode);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputVal.trim()) {
            localStorage.setItem("lastRepoInput", inputVal.trim());
            localStorage.setItem("lastRepoMode", mode);
            onSearch(inputVal.trim(), mode);
        }
    };

    const handleClear = () => {
        setInputVal("");
        localStorage.removeItem("lastRepoInput");
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-2xl">
            {/* Mode toggle */}
            <div className="flex items-center shrink-0 bg-muted/50 p-0.5 rounded-lg border h-9">
                <button
                    type="button"
                    onClick={() => setMode("github")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${mode === "github" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <Github className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">GitHub</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMode("local")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${mode === "local" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Local</span>
                </button>
            </div>

            {/* Search input + button */}
            <div className="flex gap-2 flex-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="repo-search-input"
                        placeholder={mode === "github" ? "owner/repo or GitHub URL" : "Absolute path, e.g. C:\\Projects\\MyRepo"}
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        className="pl-9 pr-8 h-9 text-sm"
                        disabled={isLoading}
                    />
                    {inputVal && !isLoading && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <Button type="submit" disabled={isLoading || !inputVal.trim()} size="sm" className="h-9 px-4 shrink-0">
                    {isLoading ? "Loading..." : "Visualize"}
                </Button>
            </div>
        </form>
    );
}
