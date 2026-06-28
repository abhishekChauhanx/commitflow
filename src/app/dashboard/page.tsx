import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RepoOnboarding from "@/components/dashboard/RepoOnboarding";
import ContributionHeatmap from "@/components/dashboard/ContributionHeatmap";
import StatsCards from "@/components/dashboard/StatsCards";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

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
      <h1 className="text-2xl font-bold mb-1">
        Welcome back, {session?.user?.name} 👋
      </h1>
      <p className="text-gray-500 mb-6">
        Target repo: <span className="text-emerald-400">{user.repoName}</span>
      </p>

      <StatsCards userId={user.id} />

      <div className="mb-8">
        <ContributionHeatmap />
      </div>

      <ActivityFeed userId={user.id} />
    </div>
  );
}