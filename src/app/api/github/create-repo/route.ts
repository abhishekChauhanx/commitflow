import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUserRepo } from "@/lib/github";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/encryption";
import { createRepoSchema } from "@/lib/validators";
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }



  const body = await req.json();
  const parsed = createRepoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { name, isPrivate } = parsed.data;

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
    const repo = await createUserRepo(decrypt(user.githubToken), name, !!isPrivate);

    await prisma.user.update({
      where: { id: user.id },
      data: { repoName: repo.name },
    });

    return NextResponse.json({ repo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}