import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { settingsSchema } from "@/lib/validators";
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      repoName: true,
      commitsPerDay: true,
      commitTime: true,
      timezone: true,
      active: true,
    },
  });

  return NextResponse.json({ settings: user });
}



export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { repoName, commitsPerDay, commitTime, timezone, active } = parsed.data;

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      ...(repoName !== undefined && { repoName }),
      ...(commitsPerDay !== undefined && { commitsPerDay }),
      ...(commitTime !== undefined && { commitTime }),
      ...(timezone !== undefined && { timezone }),
      ...(active !== undefined && { active }),
    },
  });

  return NextResponse.json({ success: true, settings: updated });
}