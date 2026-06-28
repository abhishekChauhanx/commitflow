"use client";

import { useState, useEffect } from "react";

type CommitLogEntry = {
  id: string;
  scheduledFor: string;
  count: number;
  type: string;
  status: string;
  note: string | null;
  createdAt: string;
};

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [logs, setLogs] = useState<CommitLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/commits")
      .then((res) => res.json())
      .then((data) => setLogs(data.commits || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    statusFilter === "all"
      ? logs
      : logs.filter((log) => log.status === statusFilter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusColor: Record<string, string> = {
    done: "text-emerald-400",
    pending: "text-yellow-400",
    failed: "text-red-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">History</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="done">Done</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : paginated.length === 0 ? (
        <p className="text-gray-400">No entries found.</p>
      ) : (
        <>
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Count</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log) => (
                  <tr key={log.id} className="border-t border-gray-800">
                    <td className="p-3">
                      {new Date(log.scheduledFor).toLocaleString()}
                    </td>
                    <td className="p-3">{log.count}</td>
                    <td className="p-3 capitalize">{log.type}</td>
                    <td className={`p-3 capitalize ${statusColor[log.status]}`}>
                      {log.status}
                    </td>
                    <td className="p-3 text-gray-500">{log.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
            <span>
              Page {page} of {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-800 rounded-md disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-800 rounded-md disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}