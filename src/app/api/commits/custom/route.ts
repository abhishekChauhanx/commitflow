import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBackdatedCommit } from "@/lib/github";
import { decrypt } from "@/lib/encryption";
import { customCommitSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Now TypeScript knows session.user.email is a string — safe to use here
  const allowed = checkRateLimit(`custom-commit-${session.user.email}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = customCommitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { date, count, note } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.githubToken || !user.repoName || !user.githubUsername) {
    return NextResponse.json(
      { error: "Missing repo or GitHub token" },
      { status: 400 }
    );
  }

  if (!user.email) {
    return NextResponse.json(
      { error: "No verified email found. Please log out and log back in." },
      { status: 400 }
    );
  }

  const targetDate = new Date(date);

  try {
    for (let i = 0; i < count; i++) {
      await createBackdatedCommit(
        decrypt(user.githubToken),
        user.githubUsername,
        user.repoName,
        `Backfilled commit ${i + 1}/${count}${note ? `: ${note}` : ""}`,
        targetDate,
        user.email,
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
        note: note ?? null,
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