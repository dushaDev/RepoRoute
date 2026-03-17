import { NextRequest, NextResponse } from "next/server";
import { fetchLocalRepoData } from "@/lib/localGit";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetPath = searchParams.get("path");

  if (!targetPath) {
    return NextResponse.json(
      { error: "Missing 'path' query parameter" },
      { status: 400 }
    );
  }

  try {
    const repoData = await fetchLocalRepoData(targetPath);
    return NextResponse.json(repoData);
  } catch (error: any) {
    console.error("Local API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze local repository" },
      { status: 500 }
    );
  }
}
