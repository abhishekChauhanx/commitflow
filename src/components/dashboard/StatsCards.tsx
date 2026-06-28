import { prisma } from "@/lib/prisma";

export default async function StatsCards({ userId }: { userId: string }) {
  const todayStart = new Date(new Date().toDateString());
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [doneToday, doneThisMonth, allDone] = await Promise.all([
    prisma.commitLog.findFirst({
      where: { userId, status: "done", createdAt: { gte: todayStart } },
    }),
    prisma.commitLog.aggregate({
      where: { userId, status: "done", createdAt: { gte: monthStart } },
      _sum: { count: true },
    }),
    prisma.commitLog.findMany({
      where: { userId, status: "done" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  // Calculate a simple daily streak by checking consecutive calendar days
  let streak = 0;
  const seenDays = new Set(
    allDone.map((log) => log.createdAt.toDateString())
  );
  const cursor = new Date();
  while (seenDays.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const cards = [
    { label: "Current Streak", value: `${streak} days` },
    { label: "Commits This Month", value: doneThisMonth._sum.count ?? 0 },
    { label: "Today's Status", value: doneToday ? "Done ✅" : "Pending" },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border border-gray-800 rounded-lg p-4 bg-gray-900/30"
        >
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <p className="text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}