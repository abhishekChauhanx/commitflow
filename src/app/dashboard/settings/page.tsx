"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [repoName, setRepoName] = useState("");
  const [commitsPerDay, setCommitsPerDay] = useState(1);
  const [commitTime, setCommitTime] = useState("18:00");
  const [timezone, setTimezone] = useState("UTC");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const s = data.settings;
        if (s) {
          setRepoName(s.repoName ?? "");
          setCommitsPerDay(s.commitsPerDay ?? 1);
          setCommitTime(s.commitTime ?? "18:00");
          setTimezone(s.timezone ?? "UTC");
          setActive(s.active ?? true);
        }
      });

    // Auto-detect browser timezone as a default suggestion
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone((prev) => prev || detected);
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commitsPerDay, commitTime, timezone, active }),
    });
    setSaving(false);
    setMessage(res.ok ? "Settings saved!" : "Failed to save settings");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Target Repository</label>
          <input
            value={repoName}
            disabled
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm opacity-60"
          />
          <p className="text-xs text-gray-500 mt-1">
            Change your repo from the onboarding screen or rebuild it here in a future update.
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Commits Per Day</label>
          <input
            type="number"
            min={1}
            max={10}
            value={commitsPerDay}
            onChange={(e) => setCommitsPerDay(Number(e.target.value))}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
          />
          {commitsPerDay > 5 && (
            <p className="text-xs text-yellow-500 mt-1">
              High commit counts may look unusual on your profile.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Preferred Time</label>
          <input
            type="time"
            value={commitTime}
            onChange={(e) => setCommitTime(e.target.value)}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Timezone</label>
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            id="active"
          />
          <label htmlFor="active" className="text-sm text-gray-400">
            Automation active
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-md font-medium"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {message && <p className="text-sm text-gray-400">{message}</p>}

        <button
  onClick={async () => {
    const res = await fetch("/api/github/commit", { method: "POST" });
    const data = await res.json();
    alert(res.ok ? "Commit created!" : `Error: ${data.error}`);
  }}
  className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-md font-medium ml-3"
>
  Test Commit Now
</button>
      </div>
    </div>
  );
}