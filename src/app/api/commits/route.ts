import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const commits = await prisma.commitLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ commits });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const log = await prisma.commitLog.findUnique({ where: { id } });

  if (!log || log.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (log.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending entries can be deleted" },
      { status: 400 }
    );
  }

  await prisma.commitLog.delete({ where: { id } });

  return NextResponse.json({ success: true });
}