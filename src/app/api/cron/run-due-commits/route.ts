import { prisma } from "@/lib/prisma";
import { createCommit } from "@/lib/github";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";

function getOffsetMinutes(tz: string): number {
  if (!tz || tz === "UTC") return 0;

  const utcMatch = tz.match(/UTC([+-])(\d{1,2}):(\d{2})/);
  if (utcMatch) {
    const sign = utcMatch[1] === "+" ? 1 : -1;
    return sign * (parseInt(utcMatch[2]) * 60 + parseInt(utcMatch[3]));
  }

  const utcShortMatch = tz.match(/UTC([+-])(\d{1,2})$/);
  if (utcShortMatch) {
    const sign = utcShortMatch[1] === "+" ? 1 : -1;
    return sign * parseInt(utcShortMatch[2]) * 60;
  }

  try {
    const now = new Date();
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = now.toLocaleString("en-US", { timeZone: tz });
    const utcTime = new Date(utcStr).getTime();
    const tzTime = new Date(tzStr).getTime();
    return Math.round((tzTime - utcTime) / 60000);
  } catch {}

  const aliases: Record<string, number> = {
    IST: 330,
    EST: -300,
    EDT: -240,
    CST: -360,
    CDT: -300,
    MST: -420,
    MDT: -360,
    PST: -480,
    PDT: -420,
    GMT: 0,
    BST: 60,
    CET: 60,
    CEST: 120,
    JST: 540,
    AEST: 600,
    AEDT: 660,
    SGT: 480,
    HKT: 480,
    PKT: 300,
    BDT: 360,
    NPT: 345,
    ICT: 420,
    GST: 240,
    AST: -240,
    BRT: -180,
    ART: -180,
  };

  const upperTz = tz.trim().toUpperCase();
  if (aliases[upperTz] !== undefined) {
    return aliases[upperTz];
  }

  console.warn(`Unknown timezone: ${tz}, falling back to UTC`);
  return 0;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  console.log(`[CRON] Running at UTC: ${now.toISOString()}`);
  console.log(`[CRON] Current UTC minutes: ${nowMinutes} (${now.getUTCHours()}:${String(now.getUTCMinutes()).padStart(2, "0")} UTC)`);

  const allActiveUsers = await prisma.user.findMany({
    where: {
      active: true,
      repoName: { not: null },
    },
  });

  console.log(`[CRON] Total active users found: ${allActiveUsers.length}`);

  const dueUsers = allActiveUsers.filter((user) => {
    const [h, m] = user.commitTime.split(":").map(Number);
    const userMinutes = h * 60 + m;
    const offsetMinutes = getOffsetMinutes(user.timezone || "UTC");

    let utcUserMinutes = userMinutes - offsetMinutes;
    if (utcUserMinutes < 0) utcUserMinutes += 1440;
    if (utcUserMinutes >= 1440) utcUserMinutes -= 1440;

    const diff = Math.abs(nowMinutes - utcUserMinutes);

    console.log(`[CRON] User: ${user.githubUsername}`);
    console.log(`[CRON]   commitTime: ${user.commitTime}, timezone: ${user.timezone}`);
    console.log(`[CRON]   offsetMinutes: ${offsetMinutes}`);
    console.log(`[CRON]   utcUserMinutes: ${utcUserMinutes} (${Math.floor(utcUserMinutes / 60)}:${String(utcUserMinutes % 60).padStart(2, "0")} UTC)`);
    console.log(`[CRON]   nowMinutes: ${nowMinutes}, diff: ${diff}, match: ${diff <= 5}`);

    return diff <= 5;
  });

  console.log(`[CRON] Due users: ${dueUsers.length}`);

  const results = [];

  for (const user of dueUsers) {
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
      console.log(`[CRON] User ${user.githubUsername} already committed today, skipping`);
      results.push({ user: user.githubUsername, skipped: true });
      continue;
    }

    try {
      console.log(`[CRON] Creating ${user.commitsPerDay} commits for ${user.githubUsername}`);

      let decryptedToken: string;
      try {
        decryptedToken = decrypt(user.githubToken!);
      } catch (decryptErr: any) {
        console.error(`[CRON] Token decrypt failed for ${user.githubUsername}: ${decryptErr.message}`);
        console.error(`[CRON] Token may be stored as plain text — user needs to log out and back in`);
        results.push({ user: user.githubUsername, error: "Token decrypt failed — user must re-login" });
        continue;
      }

      for (let i = 0; i < user.commitsPerDay; i++) {
        await createCommit(
          decryptedToken,
          user.githubUsername!,
          user.repoName!,
          `Scheduled commit ${i + 1}/${user.commitsPerDay}`
        );
        console.log(`[CRON] Commit ${i + 1}/${user.commitsPerDay} created for ${user.githubUsername}`);
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
      console.error(`[CRON] Commit failed for ${user.githubUsername}: ${err.message}`);
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