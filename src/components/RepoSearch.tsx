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
        <form onSubmit={handleSubmit} className="flex flex-col w-full max-w-2xl gap-3">
            <div className="flex items-center gap-2 self-start bg-muted/50 p-1 rounded-lg border">
                <button
                    type="button"
                    onClick={() => setMode("github")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === "github" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <Github className="w-4 h-4" />
                    GitHub
                </button>
                <button
                    type="button"
                    onClick={() => setMode("local")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === "local" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <FolderGit2 className="w-4 h-4" />
                    Local Folder
                </button>
            </div>
            
            <div className="flex gap-2 w-full">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="repo-search-input"
                        placeholder={mode === "github" ? "Enter GitHub Repo URL (e.g., facebook/react)" : "Enter absolute local folder path (e.g., C:\\Projects\\MyRepo)"}
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        className="pl-10 pr-10"
                        disabled={isLoading}
                    />
                    {inputVal && !isLoading && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <Button type="submit" disabled={isLoading || !inputVal.trim()}>
                    {isLoading ? "Loading..." : "Visualize"}
                </Button>
            </div>
        </form>
    );
}
