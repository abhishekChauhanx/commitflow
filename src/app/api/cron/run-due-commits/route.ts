import { prisma } from "@/lib/prisma";
import { createCommit } from "@/lib/github";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Security: only allow calls that include our secret key
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ========== THIS IS THE NEW PART ==========
  // Find users whose commitTime is within a 5-minute window of now
  const allActiveUsers = await prisma.user.findMany({
    where: {
      active: true,
      repoName: { not: null },
    },
  });

  const dueUsers = allActiveUsers.filter((user) => {
    const [h, m] = user.commitTime.split(":").map(Number);
    const userMinutes = h * 60 + m; // convert to total minutes since midnight
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes(); // current time in total minutes
    return Math.abs(nowMinutes - userMinutes) <= 5; // within a 5-minute window
  });
  // ========== END OF NEW PART ==========

  const results = [];

  for (const user of dueUsers) {
    // Avoid duplicate commits if this endpoint runs multiple times within the same minute
    const todayStart = new Date(now.toDateString());
    const alreadyDone = await prisma.commitLog.findFirst({
      where: {
        userId: user.id,
        type: "scheduled",
        status: "done",
        createdAt: { gte: todayStart },
      },
    });

    if (alreadyDone) {
      results.push({ user: user.githubUsername, skipped: true });
      continue;
    }

    try {
      for (let i = 0; i < user.commitsPerDay; i++) {
        await createCommit(
          user.githubToken!,
          user.githubUsername!,
          user.repoName!,
          `Scheduled commit ${i + 1}/${user.commitsPerDay}`
        );
      }

      await prisma.commitLog.create({
        data: {
          userId: user.id,
          scheduledFor: now,
          count: user.commitsPerDay,
          type: "scheduled",
          status: "done",
        },
      });

      results.push({ user: user.githubUsername, success: true });
    } catch (err: any) {
      await prisma.commitLog.create({
        data: {
          userId: user.id,
          scheduledFor: now,
          count: user.commitsPerDay,
          type: "scheduled",
          status: "failed",
          note: err.message,
        },
      });

      results.push({ user: user.githubUsername, error: err.message });
    }
  }

  return NextResponse.json({ checked: dueUsers.length, results });
}