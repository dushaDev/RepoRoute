"use client";

import React, { useEffect, useState, useMemo } from "react";
import { GitCommit, GitBranch } from "@/lib/github";

interface CommitGraphProps {
    commits: GitCommit[];
    branches: GitBranch[];
}

export function CommitGraph({ commits, branches }: CommitGraphProps) {
    const [mounted, setMounted] = useState(false);
    const [hoveredLane, setHoveredLane] = useState<number | null>(null);
    const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const graphData = useMemo(() => {
        if (commits.length === 0) return null;

        // 1. Sort commits chronologically (Earliest to Latest)
        const sortedCommits = [...commits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 2. Identify and rank branches (only those that actually have data)
        const branchNames = Array.from(new Set(branches.map(b => b.name)));
        const mainBranchName = branchNames.find(n => n === 'main' || n === 'master') || branchNames[0] || 'main';
        const otherBranches = branchNames.filter(n => n !== mainBranchName);

        const laneMap = new Map<string, number>();
        laneMap.set(mainBranchName, 0);
        otherBranches.forEach((name, i) => laneMap.set(name, i + 1));

        // 3. Assign lanes to commits
        const commitToLane = new Map<string, number>();

        // Initial pass: Assign lanes to branch heads (lowest lane wins if a commit is head of multiple)
        branches.forEach(b => {
            const lane = laneMap.get(b.name) ?? 0;
            if (!commitToLane.has(b.commit) || lane < commitToLane.get(b.commit)!) {
                commitToLane.set(b.commit, lane);
            }
        });

        // Backward propagation pass: Pull lanes from children to parents
        // This ensures a commit stays in the 'main' lane if any of its descendants lead to main.
        for (let i = sortedCommits.length - 1; i >= 0; i--) {
            const commit = sortedCommits[i];
            const currentLane = commitToLane.get(commit.sha);

            if (currentLane !== undefined) {
                commit.parents.forEach(pSha => {
                    // Only update if parent has no lane or if current lane is more "primary" (lower index)
                    if (!commitToLane.has(pSha) || currentLane < commitToLane.get(pSha)!) {
                        commitToLane.set(pSha, currentLane);
                    }
                });
            }
        }

        // Fill in any remainders (orphans or commits outside branch heads)
        sortedCommits.forEach(c => {
            if (!commitToLane.has(c.sha)) {
                commitToLane.set(c.sha, 0);
            }
        });

        // Remove empty lanes from laneMap to prevent showing unused branch labels
        const usedLanes = new Set(commitToLane.values());
        const filteredLaneMap = new Map<string, number>();
        let newLaneIndex = 0;

        // Re-map lanes to be contiguous (0, 1, 2, ...) 
        // to avoid gaps in the graph if a middle lane was removed
        Array.from(laneMap.entries()).forEach(([name, oldLane]) => {
            if (usedLanes.has(oldLane)) {
                filteredLaneMap.set(name, newLaneIndex);
                // Update commitToLane to use the new contiguous index
                for (const [sha, lane] of Array.from(commitToLane.entries())) {
                    if (lane === oldLane) {
                        commitToLane.set(sha, newLaneIndex);
                    }
                }
                newLaneIndex++;
            }
        });

        return { sortedCommits, commitToLane, laneMap: filteredLaneMap, mainBranchName };
    }, [commits, branches]);

    // Map of SHA -> Branch names that point to this commit
    const branchHeads = useMemo(() => {
        const map = new Map<string, string[]>();
        branches.forEach(b => {
            const existing = map.get(b.commit) || [];
            map.set(b.commit, [...existing, b.name]);
        });
        return map;
    }, [branches]);

    if (!mounted || !graphData) {
        return <div className="p-8 text-center text-muted-foreground bg-card rounded-lg border">Initializing graph...</div>;
    }

    const { sortedCommits, commitToLane, laneMap } = graphData;

    const nodeRadius = 4.5; // Smaller nodes
    const laneHeight = 44; // Much tighter lanes
    const commitWidth = 80; // Drastically reduced horizontal spacing
    const leftPadding = 160;
    const topPadding = 32;

    const svgWidth = Math.max(sortedCommits.length * commitWidth + 120, 800);
    const svgHeight = (Math.max(laneMap.size, 1) * laneHeight) + topPadding + 40;

    const getLaneColor = (lane: number) => {
        const colors = [
            '#EF4444', // Rose-500
            '#F59E0B', // Amber-500
            '#3B82F6', // Blue-500
            '#10B981', // Emerald-500
            '#8B5CF6', // Violet-500
            '#EC4899', // Pink-500
        ];
        return colors[lane % colors.length];
    };

    return (
        <div className="bg-card rounded-3xl border shadow-2xl relative overflow-hidden group/graph">
            {/* Header Overlay completely removed based on user request */}

            <div className="relative flex overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                {/* Sticky Lane Labels Panel */}
                <div className="sticky left-0 z-20 flex flex-col bg-card/95 backdrop-blur-xl border-r shadow-[15px_0_20px_-10px_rgba(0,0,0,0.05)] dark:shadow-[15px_0_20px_-10px_rgba(0,0,0,0.3)] min-w-[140px] pe-6">
                    <div className="relative w-full" style={{ height: svgHeight }}>
                        {Array.from(laneMap.entries()).map(([name, lane]) => {
                            const color = getLaneColor(lane);
                            const isHovered = hoveredLane === lane;
                            return (
                                <div
                                    key={`label-${name}`}
                                    className="absolute left-4 -translate-y-1/2 flex items-center transition-all duration-300"
                                    style={{ top: `${topPadding + lane * laneHeight}px` }}
                                    onMouseEnter={() => setHoveredLane(lane)}
                                    onMouseLeave={() => setHoveredLane(null)}
                                >
                                    <div
                                        className={`px-2 py-0.5 rounded-md border shadow-sm transition-all cursor-crosshair group/pill ${isHovered ? 'scale-110 shadow-lg' : ''}`}
                                        style={{
                                            backgroundColor: `${color}15`,
                                            borderColor: isHovered ? color : `${color}50`,
                                        }}
                                    >
                                        <span
                                            className="text-[11px] font-bold tracking-tight whitespace-nowrap capitalize"
                                            style={{ color: color }}
                                        >
                                            {name.length > 18 ? name.substring(0, 16) + '..' : name}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scrolling Graph Area */}
                <div className="relative flex-1">
                    <svg width={svgWidth} height={svgHeight} className="overflow-visible font-sans animate-in fade-in duration-1000">
                        {/* Background Lane Lines */}
                        {Array.from(laneMap.values()).map((lane) => {
                            const y = topPadding + lane * laneHeight;
                            return (
                                <g key={`bg-lane-${lane}`}>
                                    <line
                                        x1={0}
                                        y1={y}
                                        x2={svgWidth}
                                        y2={y}
                                        className="stroke-muted/10 dark:stroke-muted/5"
                                        strokeWidth="1"
                                        strokeDasharray="8 8"
                                    />
                                </g>
                            );
                        })}

                        {/* Connections (Edges) */}
                        {sortedCommits.map((commit, i) => {
                            const x = i * commitWidth + 40;
                            const y = topPadding + (commitToLane.get(commit.sha) ?? 0) * laneHeight;

                            return commit.parents.map(pSha => {
                                const pIndex = sortedCommits.findIndex(c => c.sha === pSha);
                                if (pIndex === -1) return null;

                                const px = pIndex * commitWidth + 40;
                                const py = topPadding + (commitToLane.get(pSha) ?? 0) * laneHeight;

                                const dx = x - px;
                                const controlX1 = px + dx * 0.45;
                                const controlX2 = x - dx * 0.45;

                                const isHighlighted = hoveredLane !== null && (commitToLane.get(commit.sha) === hoveredLane || commitToLane.get(pSha) === hoveredLane);
                                const isFaded = hoveredLane !== null && !isHighlighted;

                                return (
                                    <path
                                        key={`edge-${commit.sha}-${pSha}`}
                                        d={`M ${px} ${py} C ${controlX1} ${py}, ${controlX2} ${y}, ${x} ${y}`}
                                        fill="none"
                                        stroke={isHighlighted ? getLaneColor(hoveredLane) : undefined}
                                        className={isHighlighted
                                            ? "opacity-90 transition-all duration-300"
                                            : isFaded
                                                ? "opacity-5 stroke-slate-400 dark:stroke-slate-600 transition-all duration-300"
                                                : "stroke-slate-400 dark:stroke-slate-600 opacity-20 group-hover/graph:opacity-50 transition-all duration-300"
                                        }
                                        strokeWidth={isHighlighted ? 3 : isFaded ? 1 : 2}
                                        strokeLinecap="round"
                                    />
                                );
                            });
                        })}

                        {/* Nodes (Commits) */}
                        {sortedCommits.map((commit, i) => {
                            const x = i * commitWidth + 40;
                            const y = topPadding + (commitToLane.get(commit.sha) ?? 0) * laneHeight;
                            const lane = commitToLane.get(commit.sha) ?? 0;
                            const color = getLaneColor(lane);
                            const heads = branchHeads.get(commit.sha) || [];

                            const isHighlighted = hoveredLane === lane;
                            const isFaded = hoveredLane !== null && !isHighlighted;

                            return (
                                <g
                                    key={`node-group-${commit.sha}`}
                                    className={`group/node cursor-pointer transition-opacity duration-300 ${isFaded ? 'opacity-20' : 'opacity-100'}`}
                                    onMouseEnter={() => setHoveredCommit(commit.sha)}
                                    onMouseLeave={() => setHoveredCommit(null)}
                                >
                                    {/* Interaction Aura */}
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={nodeRadius + 10}
                                        fill={color}
                                        className="opacity-0 group-hover/node:opacity-10 transition-all scale-50 group-hover/node:scale-100"
                                    />

                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={nodeRadius + 2}
                                        className="fill-card stroke-card"
                                        strokeWidth="2"
                                    />
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={nodeRadius}
                                        fill={color}
                                        className="filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-all group-hover/node:r-[6px]"
                                    />

                                    {/* Branch Head Tags - Compacted */}
                                    {heads.length > 0 && (
                                        <g transform={`translate(${x + 10}, ${y - 8})`}>
                                            {heads.map((hName, hIdx) => {
                                                const branchLane = Array.from(laneMap.entries()).find(([n]) => n === hName)?.[1] ?? 0;
                                                const bColor = getLaneColor(branchLane);
                                                return (
                                                    <g key={`head-${commit.sha}-${hName}`} transform={`translate(0, ${hIdx * 18})`}>
                                                        <rect
                                                            rx={3}
                                                            width={Math.min(hName.length * 6 + 12, 100)}
                                                            height={14}
                                                            fill={bColor}
                                                            className="shadow-sm opacity-90"
                                                        />
                                                        <text
                                                            x={5}
                                                            y={10}
                                                            fill="white"
                                                            className="text-[9px] font-bold capitalize tracking-wide leading-none pointer-events-none"
                                                        >
                                                            {hName.length > 15 ? hName.substring(0, 13) + '..' : hName}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    )}

                                    <text
                                        x={x}
                                        y={y + 14}
                                        textAnchor="middle"
                                        className="fill-muted-foreground text-[10px] font-bold group-hover/node:fill-foreground transition-colors font-mono tracking-tighter pointer-events-none"
                                    >
                                        {commit.sha.substring(0, 7)}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Custom Rich Tooltip Overlay */}
                    {hoveredCommit && (() => {
                        const commit = sortedCommits.find(c => c.sha === hoveredCommit);
                        if (!commit) return null;
                        const idx = sortedCommits.findIndex(c => c.sha === hoveredCommit);
                        const x = idx * commitWidth + 40;
                        const y = topPadding + (commitToLane.get(commit.sha) ?? 0) * laneHeight;

                        return (
                            <div
                                className="absolute z-50 pointer-events-none p-4 rounded-xl bg-card border shadow-2xl w-64 transform -translate-x-1/2 mt-4 animate-in fade-in zoom-in-95 duration-150"
                                style={{ left: x, top: y + nodeRadius }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getLaneColor(commitToLane.get(commit.sha) ?? 0) }} />
                                    <span className="text-[11px] font-mono font-black text-foreground">{commit.sha.substring(0, 7)}</span>
                                    <span className="text-[10px] ml-auto font-medium text-muted-foreground/60">{new Date(commit.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm font-semibold leading-relaxed mb-3 break-all whitespace-pre-wrap">{commit.message}</p>
                                <div className="flex items-center gap-2 pt-3 border-t">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                                        {commit.author.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">{commit.author}</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

function GitBranchIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <line x1="6" y1="3" x2="6" y2="15"></line>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M18 9a9 9 0 0 1-9 9"></path>
        </svg>
    );
}
