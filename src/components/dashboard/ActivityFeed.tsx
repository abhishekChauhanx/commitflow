import { prisma } from "@/lib/prisma";

export default async function ActivityFeed({ userId }: { userId: string }) {
  const logs = await prisma.commitLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const statusColor: Record<string, string> = {
    done: "text-emerald-400",
    pending: "text-yellow-400",
    failed: "text-red-400",
  };

  return (
    <div className="border border-gray-800 rounded-lg p-5 bg-gray-900/30">
      <h3 className="text-sm text-gray-400 mb-4">Recent Activity</h3>
      {logs.length === 0 ? (
        <p className="text-gray-500 text-sm">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="flex justify-between text-sm">
              <span className="text-gray-300">
                {log.type === "custom" ? "Backfill" : "Scheduled"} —{" "}
                {log.count} commit{log.count > 1 ? "s" : ""}
              </span>
              <span className={statusColor[log.status]}>{log.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}