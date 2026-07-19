import { prisma } from "@/lib/prisma";
import { createCommit } from "@/lib/github";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/encryption";
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
  const userMinutes = h * 60 + m;

  // Convert user's timezone offset to minutes and apply it
  let offsetMinutes = 0;
  const tz = user.timezone || "UTC";
  const match = tz.match(/UTC([+-])(\d{1,2}):(\d{2})/);
  if (match) {
    const sign = match[1] === "+" ? 1 : -1;
    offsetMinutes = sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
  }

  // Convert user's local commitTime to UTC minutes for comparison
  let utcUserMinutes = userMinutes - offsetMinutes;
  if (utcUserMinutes < 0) utcUserMinutes += 1440;
  if (utcUserMinutes >= 1440) utcUserMinutes -= 1440;

  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return Math.abs(nowMinutes - utcUserMinutes) <= 5;
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
  decrypt(user.githubToken!),
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