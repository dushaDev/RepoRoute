"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface RepoSearchProps {
    onSearch: (url: string) => void;
    isLoading: boolean;
}

export function RepoSearch({ onSearch, isLoading }: RepoSearchProps) {
    const [url, setUrl] = useState("");

    useEffect(() => {
        const savedUrl = localStorage.getItem("lastRepoUrl");
        if (savedUrl) {
            setUrl(savedUrl);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            localStorage.setItem("lastRepoUrl", url.trim());
            onSearch(url.trim());
        }
    };

    const handleClear = () => {
        setUrl("");
        localStorage.removeItem("lastRepoUrl");
    };

    return (
        <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    id="repo-search-input"
                    placeholder="Enter GitHub Repo URL (e.g., facebook/react or full URL)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                />
                {url && !isLoading && (
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
            <Button type="submit" disabled={isLoading || !url.trim()}>
                {isLoading ? "Loading..." : "Visualize"}
            </Button>
        </form>
    );
}
