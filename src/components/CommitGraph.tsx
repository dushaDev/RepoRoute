"use client";

import React, { useEffect, useState, useMemo } from "react";
import { GitCommit, GitBranch } from "@/lib/github";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface CommitGraphProps {
    commits: GitCommit[];
    branches: GitBranch[];
}

export function CommitGraph({ commits, branches }: CommitGraphProps) {
    const [mounted, setMounted] = useState(false);
    const [hoveredLane, setHoveredLane] = useState<number | null>(null);
    const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);

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
        // This ensures a commit stays in its original lane (like 'dev') until it hits the branching off point.
        for (let i = sortedCommits.length - 1; i >= 0; i--) {
            const commit = sortedCommits[i];
            const currentLane = commitToLane.get(commit.sha);

            if (currentLane !== undefined) {
                // pIdx === 0 is the direct parent (same branch history usually)
                // pIdx > 0 is the incoming merge source
                commit.parents.forEach((pSha, pIdx) => {
                    const isDirectHistory = pIdx === 0;
                    
                    if (!commitToLane.has(pSha)) {
                        if (isDirectHistory) {
                            // If parent has no lane yet, it inherits the child's straight-line history
                            commitToLane.set(pSha, currentLane);
                        } else {
                            // This is an incoming merge source (a different branch, potentially deleted).
                            // We still create a lane for it so the visual line is drawn on the graph.
                            // The label in the sidebar will mark it as "(deleted)" if not in active branches.
                            const rawName = commit.sourceBranch || `merged-${pSha.substring(0, 6)}`;
                            // Strip the username/org prefix (e.g. "dushan/dock" -> "dock") for lane key
                            const laneName = `__merged__${rawName}`;
                            
                            let assignedLane = laneMap.get(laneName);
                            if (assignedLane === undefined) {
                                assignedLane = Math.max(0, ...Array.from(laneMap.values()), ...Array.from(commitToLane.values())) + 1;
                                laneMap.set(laneName, assignedLane);
                            }
                            
                            commitToLane.set(pSha, assignedLane);
                        }
                    } else if (isDirectHistory && currentLane < commitToLane.get(pSha)!) {
                        // Only force a parent to upgrade to a primary lane (like 'main' over 'dev') 
                        // if we are travelling straight down the primary branch's direct history.
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

        // Ensure all explicitly requested branches from the API get a lane if possible
        const usedLanes = new Set(commitToLane.values());
        const filteredLaneMap = new Map<string, number>();
        let newLaneIndex = 0;

        Array.from(laneMap.entries()).forEach(([name, oldLane]) => {
            // Keep the lane if it has any commits directly mapped to it OR if it's one of the branches explicitly listed by Git
            if (usedLanes.has(oldLane) || branchNames.includes(name)) {
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

        // Ensure every branch head commit is actually assigned to its own lane if it was overwritten by a target 
        // This ensures the actual tip of `dev` stays in the `dev` lane
        branches.forEach(b => {
             const lane = filteredLaneMap.get(b.name);
             if (lane !== undefined && commitToLane.get(b.commit) !== lane) {
                  // Forcing the absolute HEAD commit of a branch to always sit in its own lane
                  commitToLane.set(b.commit, lane);
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

    // Set of all active branch names for O(1) lookup in the tooltip
    const activeBranchNames = useMemo(() => new Set(branches.map(b => b.name)), [branches]);


    if (!mounted || !graphData) {
        return <div className="p-8 text-center text-muted-foreground bg-card rounded-lg border">Initializing graph...</div>;
    }

    const { sortedCommits, commitToLane, laneMap } = graphData;

    const nodeRadius = 4.5; // Smaller nodes
    const laneHeight = 44; // Much tighter lanes
    const baseCommitWidth = 80; // Drastically reduced horizontal spacing
    const commitWidth = baseCommitWidth * zoomLevel;
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
        <div className="bg-card rounded-3xl border shadow-2xl relative overflow-hidden group/graph flex flex-col">
            {/* Zoom Controls Panel */}
            <div className="absolute bottom-6 right-6 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-md border p-1.5 rounded-2xl shadow-xl">
                <button
                    onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.2))}
                    className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors disabled:opacity-50"
                    disabled={zoomLevel <= 0.2}
                    title="Shrink Graph Horizontally"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <div className="px-2 text-xs font-bold font-mono min-w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                </div>
                <button
                    onClick={() => setZoomLevel(Math.min(3.0, zoomLevel + 0.2))}
                    className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors disabled:opacity-50"
                    disabled={zoomLevel >= 3.0}
                    title="Expand Graph Horizontally"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-border mx-1" />
                <button
                    onClick={() => setZoomLevel(1)}
                    className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                    title="Reset Zoom"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            <div className="relative flex overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                {/* Sticky Lane Labels Panel */}
                <div className="sticky left-0 z-20 flex flex-col bg-card/95 backdrop-blur-xl border-r shadow-[15px_0_20px_-10px_rgba(0,0,0,0.05)] dark:shadow-[15px_0_20px_-10px_rgba(0,0,0,0.3)] min-w-[140px] pe-6">
                    <div className="relative w-full" style={{ height: svgHeight }}>
                        {Array.from(laneMap.entries()).map(([name, lane]) => {
                            const color = getLaneColor(lane);
                            const isHovered = hoveredLane === lane;
                        const isDeletedBranch = name.startsWith('__merged__');
                        const displayName = isDeletedBranch
                            ? name.replace('__merged__', '').split('/').pop() || name
                            : name;
                            
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
                                            borderStyle: isDeletedBranch ? 'dashed' : 'solid',
                                        }}
                                    >
                                        <span
                                            className="text-[11px] font-bold tracking-tight whitespace-nowrap capitalize"
                                            style={{ color: color }}
                                        >
                                            {displayName.length > 14 ? displayName.substring(0, 12) + '..' : displayName}
                                        </span>
                                        {isDeletedBranch && (
                                            <span className="ml-1 text-[9px] opacity-60 italic font-normal">del</span>
                                        )}
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

                            return commit.parents.map((pSha, parentCommitIdx) => {
                                const pIndex = sortedCommits.findIndex(c => c.sha === pSha);
                                if (pIndex === -1) return null;

                                const px = pIndex * commitWidth + 40;
                                const py = topPadding + (commitToLane.get(pSha) ?? 0) * laneHeight;

                                const dx = x - px;
                                const controlX1 = px + dx * 0.45;
                                const controlX2 = x - dx * 0.45;

                                const isHighlighted = hoveredLane !== null && (commitToLane.get(commit.sha) === hoveredLane || commitToLane.get(pSha) === hoveredLane);
                                const isFaded = hoveredLane !== null && !isHighlighted;
                                
                                // Identify if this edge is a merge line coming from a different branch
                                const isMergeSourceNode = parentCommitIdx > 0;
                                const parentLaneColor = getLaneColor(commitToLane.get(pSha) ?? 0);
                                const strokeColor = isHighlighted ? getLaneColor(hoveredLane!) : (isMergeSourceNode ? parentLaneColor : undefined);

                                return (
                                    <path
                                        key={`edge-${commit.sha}-${pSha}`}
                                        d={`M ${px} ${py} C ${controlX1} ${py}, ${controlX2} ${y}, ${x} ${y}`}
                                        fill="none"
                                        stroke={strokeColor}
                                        strokeDasharray={isMergeSourceNode ? "6 4" : "none"}
                                        className={isHighlighted
                                            ? "opacity-90 transition-all duration-300 z-10"
                                            : isFaded && !isMergeSourceNode
                                                ? "opacity-5 stroke-slate-400 dark:stroke-slate-600 transition-all duration-300"
                                                : isFaded && isMergeSourceNode
                                                    ? "opacity-10 transition-all duration-300"
                                                    : isMergeSourceNode
                                                        ? "opacity-60 group-hover/graph:-opacity-50 transition-all duration-300 drop-shadow-sm"
                                                        : "stroke-slate-400 dark:stroke-slate-600 opacity-20 group-hover/graph:opacity-50 transition-all duration-300"
                                        }
                                        strokeWidth={isHighlighted ? 4 : (isMergeSourceNode ? 2 : (isFaded ? 1 : 2))}
                                        strokeLinecap="round"
                                        style={isMergeSourceNode ? { filter: 'brightness(1.1)' } : undefined}
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
                                    {/* Invisible large hitbox to prevent hover jitter */}
                                    <circle cx={x} cy={y} r={nodeRadius + 12} fill="transparent" />

                                    {/* Visual Aura */}
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={nodeRadius + 10}
                                        fill={color}
                                        className="opacity-0 group-hover/node:opacity-10 transition-all duration-300 scale-50 group-hover/node:scale-100 pointer-events-none"
                                    />

                                    {commit.isMerge ? (
                                        <g className="transition-transform duration-300 pointer-events-none filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)] group-hover/node:scale-125" style={{ transformOrigin: `${x}px ${y}px` }}>
                                            {/* Merge Diamond Node */}
                                            <polygon
                                                points={`${x},${y - nodeRadius - 3} ${x + nodeRadius + 3},${y} ${x},${y + nodeRadius + 3} ${x - nodeRadius - 3},${y}`}
                                                className="fill-card stroke-card"
                                                strokeWidth="2"
                                            />
                                            <polygon
                                                points={`${x},${y - nodeRadius - 2} ${x + nodeRadius + 2},${y} ${x},${y + nodeRadius + 2} ${x - nodeRadius - 2},${y}`}
                                                fill={color}
                                                stroke={commit.prNumber ? "#9333ea" : undefined} // Purple stroke if Pull Request
                                                strokeWidth={commit.prNumber ? "2" : "0"}
                                            />
                                        </g>
                                    ) : (
                                        <>
                                            <circle
                                                cx={x}
                                                cy={y}
                                                r={nodeRadius + 2}
                                                className="fill-card stroke-card pointer-events-none"
                                                strokeWidth="2"
                                            />
                                            <circle
                                                cx={x}
                                                cy={y}
                                                r={nodeRadius}
                                                fill={color}
                                                className="filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover/node:r-[6px] pointer-events-none"
                                            />
                                        </>
                                    )}

                                    {/* Branch Head Tags - Compact chips beside node */}
                                    {heads.length > 0 && (
                                        <g transform={`translate(${x + nodeRadius + 5}, ${y - 5})`}>
                                            {heads.map((hName, hIdx) => {
                                                const branchLane = Array.from(laneMap.entries()).find(([n]) => n === hName)?.[1] ?? 0;
                                                const bColor = getLaneColor(branchLane);
                                                const displayName = hName.startsWith('__merged__')
                                                    ? hName.replace('__merged__', '').split('/').pop() + ' ·del'
                                                    : (hName.length > 10 ? hName.substring(0, 9) + '..' : hName);
                                                return (
                                                    <g key={`head-${commit.sha}-${hName}`} transform={`translate(0, ${hIdx * 13})`}>
                                                        <rect
                                                            rx={2}
                                                            width={Math.min(displayName.length * 5 + 8, 80)}
                                                            height={11}
                                                            fill={bColor}
                                                            className="opacity-80"
                                                        />
                                                        <text
                                                            x={4}
                                                            y={8}
                                                            fill="white"
                                                            style={{ fontSize: '7px', fontWeight: 700, letterSpacing: '0.02em' }}
                                                            className="pointer-events-none"
                                                        >
                                                            {displayName}
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
                        const commitLaneIdx = commitToLane.get(commit.sha) ?? 0;
                        const y = topPadding + commitLaneIdx * laneHeight;
                        
                        // Reverse lookup laneMap to find the string name of the target branch lane
                        const targetBranchName = Array.from(laneMap.entries()).find(([, l]) => l === commitLaneIdx)?.[0] || 'Unknown';
                        
                        // Check if the source branch still exists in our tracked active branches
                        // We strip the `username/` prefix from `sourceBranch` first because
                        // GitHub merge messages format it as `username/branch-name`
                        // while `git branch -a` stores it as just `branch-name`.
                        const sourceBranchShortName = commit.sourceBranch?.split('/').slice(1).join('/') || commit.sourceBranch;
                        const sourceBranchIsDeleted = commit.sourceBranch &&
                            !activeBranchNames.has(commit.sourceBranch) &&
                            !activeBranchNames.has(sourceBranchShortName || '');

                        return (
                            <div
                                className="absolute z-50 pointer-events-none p-4 rounded-xl bg-card border shadow-2xl w-64 transform -translate-x-1/2 mt-4 animate-in fade-in zoom-in-95 duration-150"
                                style={{ left: x, top: y + nodeRadius }}
                            >
                                {commit.isMerge && (
                                    <div className="mb-3">
                                        {commit.prNumber ? (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wide">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>
                                                Pull Request #{commit.prNumber}
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wide">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M6 21V9a9 9 0 0 0 9 9"></path></svg>
                                                Merge Commit ({commit.parents?.length} parents)
                                            </div>
                                        )}
                                        {commit.sourceBranch && (
                                            <div className="text-[10px] text-muted-foreground mt-2 font-mono leading-tight">
                                                Merged <span className="font-bold text-foreground">{commit.sourceBranch}</span>
                                                {sourceBranchIsDeleted && <span className="text-red-500/70 ml-1 italic">(deleted)</span>}
                                                <br/>
                                                into <span className="font-bold text-foreground">{targetBranchName}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
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
