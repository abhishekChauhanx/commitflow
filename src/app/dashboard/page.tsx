import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RepoOnboarding from "@/components/dashboard/RepoOnboarding";

export default async function DashboardPage() {
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
  });

  if (!user?.repoName) {
    return <RepoOnboarding />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">
        Welcome back, {session?.user?.name} 👋
      </h1>
      <p className="text-gray-400 mb-6">
        Target repo: <span className="text-emerald-400">{user.repoName}</span>
      </p>
      <p className="text-gray-500">
        Heatmap, streaks, and stats coming in Phase 5.
      </p>
    </div>
  );
}