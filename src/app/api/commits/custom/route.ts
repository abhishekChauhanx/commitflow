import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBackdatedCommit } from "@/lib/github";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, count, note } = await req.json();

  if (!date || !count) {
    return NextResponse.json(
      { error: "Date and count are required" },
      { status: 400 }
    );
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

  const targetDate = new Date(date);

  if (!user.email) {
  return NextResponse.json(
    { error: "No verified email found on your account. Please log out and log back in." },
    { status: 400 }
  );
}

  try {
 for (let i = 0; i < count; i++) {
  await createBackdatedCommit(
    user.githubToken,
    user.githubUsername,
    user.repoName,
    `Backfilled commit ${i + 1}/${count}${note ? `: ${note}` : ""}`,
    targetDate,
    user.email!,
    user.name ?? user.githubUsername
  );
}

    const log = await prisma.commitLog.create({
      data: {
        userId: user.id,
        scheduledFor: targetDate,
        count,
        type: "custom",
        status: "done",
        note,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    await prisma.commitLog.create({
      data: {
        userId: user.id,
        scheduledFor: targetDate,
        count,
        type: "custom",
        status: "failed",
        note: err.message,
      },
    });

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}