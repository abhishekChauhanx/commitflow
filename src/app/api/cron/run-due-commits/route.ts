import { prisma } from "@/lib/prisma";
import { createCommit } from "@/lib/github";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";

// Convert any timezone string to offset in minutes
function getOffsetMinutes(tz: string): number {
  if (!tz || tz === "UTC") return 0;

  // Handle UTC+HH:MM or UTC-HH:MM format
  const utcMatch = tz.match(/UTC([+-])(\d{1,2}):(\d{2})/);
  if (utcMatch) {
    const sign = utcMatch[1] === "+" ? 1 : -1;
    return sign * (parseInt(utcMatch[2]) * 60 + parseInt(utcMatch[3]));
  }

  // Handle UTC+H or UTC-H format (no minutes)
  const utcShortMatch = tz.match(/UTC([+-])(\d{1,2})$/);
  if (utcShortMatch) {
    const sign = utcShortMatch[1] === "+" ? 1 : -1;
    return sign * parseInt(utcShortMatch[2]) * 60;
  }

  // Handle named IANA timezones (e.g. Asia/Kolkata, America/New_York)
  try {
    const now = new Date();
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = now.toLocaleString("en-US", { timeZone: tz });
    const utcTime = new Date(utcStr).getTime();
    const tzTime = new Date(tzStr).getTime();
    return Math.round((tzTime - utcTime) / 60000);
  } catch {}

  // Handle common abbreviation aliases
  const aliases: Record<string, number> = {
    IST: 330,    // India Standard Time UTC+5:30
    EST: -300,   // Eastern Standard Time UTC-5
    EDT: -240,   // Eastern Daylight Time UTC-4
    CST: -360,   // Central Standard Time UTC-6
    CDT: -300,   // Central Daylight Time UTC-5
    MST: -420,   // Mountain Standard Time UTC-7
    MDT: -360,   // Mountain Daylight Time UTC-6
    PST: -480,   // Pacific Standard Time UTC-8
    PDT: -420,   // Pacific Daylight Time UTC-7
    GMT: 0,      // Greenwich Mean Time
    BST: 60,     // British Summer Time UTC+1
    CET: 60,     // Central European Time UTC+1
    CEST: 120,   // Central European Summer Time UTC+2
    JST: 540,    // Japan Standard Time UTC+9
    AEST: 600,   // Australian Eastern Standard Time UTC+10
    AEDT: 660,   // Australian Eastern Daylight Time UTC+11
    SGT: 480,    // Singapore Time UTC+8
    HKT: 480,    // Hong Kong Time UTC+8
    PKT: 300,    // Pakistan Standard Time UTC+5
    BDT: 360,    // Bangladesh Standard Time UTC+6
    NPT: 345,    // Nepal Time UTC+5:45
    ICT: 420,    // Indochina Time UTC+7
    GST: 240,    // Gulf Standard Time UTC+4
    AST: -240,   // Atlantic Standard Time UTC-4
    NST: -210,   // Newfoundland Standard Time UTC-3:30
    BRT: -180,   // Brasilia Time UTC-3
    ART: -180,   // Argentina Time UTC-3
    NZST: 720,   // New Zealand Standard Time UTC+12
    NZDT: 780,   // New Zealand Daylight Time UTC+13
  };

  const upperTz = tz.trim().toUpperCase();
  if (aliases[upperTz] !== undefined) {
    return aliases[upperTz];
  }

  // Unknown timezone — fall back to UTC
  console.warn(`Unknown timezone: ${tz}, falling back to UTC`);
  return 0;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const allActiveUsers = await prisma.user.findMany({
    where: {
      active: true,
      repoName: { not: null },
    },
  });

  const dueUsers = allActiveUsers.filter((user) => {
    const [h, m] = user.commitTime.split(":").map(Number);
    const userMinutes = h * 60 + m;

    const offsetMinutes = getOffsetMinutes(user.timezone || "UTC");

    // Convert user's local commitTime to UTC
    let utcUserMinutes = userMinutes - offsetMinutes;
    if (utcUserMinutes < 0) utcUserMinutes += 1440;
    if (utcUserMinutes >= 1440) utcUserMinutes -= 1440;

    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    return Math.abs(nowMinutes - utcUserMinutes) <= 5;
  });

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