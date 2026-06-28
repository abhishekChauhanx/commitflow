import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DeleteAccountButton from "@/components/dashboard/DeleteAccountButton";

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
  });

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="border border-gray-800 rounded-lg p-5 bg-gray-900/30 space-y-3 mb-6">
        <div>
          <p className="text-xs text-gray-500">Name</p>
          <p className="text-sm">{user?.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">GitHub Username</p>
          <p className="text-sm">{user?.githubUsername}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Connected Repository</p>
          <p className="text-sm">{user?.repoName ?? "None selected"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Account Created</p>
          <p className="text-sm">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
          </p>
        </div>
      </div>

      <DeleteAccountButton />
    </div>
  );
}