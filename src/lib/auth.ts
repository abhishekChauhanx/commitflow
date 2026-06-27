import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: "read:user user:email repo" } },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github") {
        let email = user.email;

        // Fallback: fetch verified primary email directly if not provided
        if (!email && account.access_token) {
          const res = await fetch("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${account.access_token}` },
          });
          if (res.ok) {
            const emails = await res.json();
            const primary = emails.find((e: any) => e.primary && e.verified);
            email = primary?.email ?? emails[0]?.email ?? null;
          }
        }

        await prisma.user.upsert({
          where: { githubId: account.providerAccountId },
          update: {
            githubUsername: (profile as any)?.login,
            githubToken: account.access_token ?? "",
            email: email ?? undefined,
            name: user.name ?? undefined,
          },
          create: {
            email,
            name: user.name,
            githubId: account.providerAccountId,
            githubUsername: (profile as any)?.login,
            githubToken: account.access_token ?? "",
          },
        });
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
        });
        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session.user as any).githubUsername = dbUser.githubUsername;
        }
      }
      return session;
    },
  },
});