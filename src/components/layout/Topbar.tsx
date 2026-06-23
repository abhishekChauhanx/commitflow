import { auth, signOut } from "@/lib/auth";

export default async function Topbar() {
  const session = await auth();

  return (
    <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6">
      <span className="text-sm text-gray-400">
        {session?.user?.email}
      </span>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {session?.user?.name}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm">
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}