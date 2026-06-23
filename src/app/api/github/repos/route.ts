import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchUserRepos } from "@/lib/github";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.githubToken) {
    return NextResponse.json({ error: "No GitHub token found" }, { status: 400 });
  }

  try {
    const repos = await fetchUserRepos(user.githubToken);
    return NextResponse.json({ repos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}