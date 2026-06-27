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

export default function CommitsPage() {
  const [logs, setLogs] = useState<CommitLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  function loadLogs() {
    setLoading(true);
    fetch("/api/commits")
      .then((res) => res.json())
      .then((data) => setLogs(data.commits || []))
      .finally(() => setLoading(false));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this scheduled commit entry?")) return;
    const res = await fetch("/api/commits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setLogs((prev) => prev.filter((log) => log.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
  }

  const statusColor: Record<string, string> = {
    done: "text-emerald-400",
    pending: "text-yellow-400",
    failed: "text-red-400",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Commits</h1>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400">No commit entries yet.</p>
      ) : (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Count</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-800">
                  <td className="p-3">
                    {new Date(log.scheduledFor).toLocaleString()}
                  </td>
                  <td className="p-3">{log.count}</td>
                  <td className="p-3 capitalize">{log.type}</td>
                  <td className={`p-3 capitalize ${statusColor[log.status]}`}>
                    {log.status}
                  </td>
                  <td className="p-3 text-right">
                    {log.status === "pending" && (
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}