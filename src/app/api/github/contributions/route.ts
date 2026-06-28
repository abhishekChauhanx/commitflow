/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchContributions } from "@/lib/github";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.githubToken || !user.githubUsername) {
    return NextResponse.json({ error: "Missing GitHub info" }, { status: 400 });
  }

  try {
    const contributions = await fetchContributions(
      decrypt(user.githubToken),
      user.githubUsername
    );
    return NextResponse.json(contributions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}