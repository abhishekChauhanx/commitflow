import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          Welcome, {session.user?.name ?? "Developer"} 👋
        </h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm">
            Logout
          </button>
        </form>
      </div>
      <p className="text-gray-400">
        Dashboard content (settings, commits, heatmap) comes in Phase 2.
      </p>
    </main>
  );
}