import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCommit } from "@/lib/github";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/encryption";
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.githubToken || !user.repoName || !user.githubUsername) {
    return NextResponse.json(
      { error: "Missing repo or GitHub token" },
      { status: 400 }
    );
  }

  try {
    const result = await createCommit(
  decrypt(user.githubToken),
  user.githubUsername,
  user.repoName,
  "Manual test commit"
);

    await prisma.commitLog.create({
      data: {
        userId: user.id,
        scheduledFor: new Date(),
        count: 1,
        type: "scheduled",
        status: "done",
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    await prisma.commitLog.create({
      data: {
        userId: user.id,
        scheduledFor: new Date(),
        count: 1,
        type: "scheduled",
        status: "failed",
        note: err.message,
      },
    });

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}