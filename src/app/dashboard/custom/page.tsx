"use client";

import { useState } from "react";

export default function CustomCommitPage() {
  const [date, setDate] = useState("");
  const [count, setCount] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!date) {
      setMessage("Please select a date.");
      return;
    }
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/commits/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, count, note }),
    });

    setLoading(false);

    if (res.ok) {
      setMessage("Backfill complete! Check your GitHub repo.");
      setDate("");
      setCount(1);
      setNote("");
    } else {
      const data = await res.json();
      setMessage(`Error: ${data.error}`);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Backfill a Specific Day</h1>
      <p className="text-gray-400 text-sm mb-6">
        Use this to add commits for a day you forgot to push real work — not
        as a way to misrepresent your activity history.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Number of Commits
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Note (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. forgot to push Tuesday's work"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-md font-medium"
        >
          {loading ? "Processing..." : "Add to Repository"}
        </button>

        {message && <p className="text-sm text-gray-400">{message}</p>}
      </div>
    </div>
  );
}