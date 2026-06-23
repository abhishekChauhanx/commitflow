import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUserRepo } from "@/lib/github";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, isPrivate } = await req.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Repo name is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.githubToken) {
    return NextResponse.json({ error: "No GitHub token found" }, { status: 400 });
  }

  try {
    const repo = await createUserRepo(user.githubToken, name, !!isPrivate);

    await prisma.user.update({
      where: { id: user.id },
      data: { repoName: repo.name },
    });

    return NextResponse.json({ repo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}