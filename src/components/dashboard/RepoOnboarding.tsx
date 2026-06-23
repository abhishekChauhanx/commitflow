"use client";

import { useState, useEffect } from "react";

type Repo = { name: string; fullName: string; private: boolean };

export default function RepoOnboarding() {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "existing") {
      fetch("/api/github/repos")
        .then((res) => res.json())
        .then((data) => setRepos(data.repos || []))
        .catch(() => setError("Failed to load repos"));
    }
  }, [mode]);

  async function handleUseExisting() {
    if (!selectedRepo) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoName: selectedRepo }),
    });
    setLoading(false);
    if (res.ok) window.location.reload();
    else setError("Failed to save repo selection");
  }

  async function handleCreateNew() {
    if (!newRepoName) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/github/create-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRepoName, isPrivate }),
    });
    setLoading(false);
    if (res.ok) window.location.reload();
    else {
      const data = await res.json();
      setError(data.error || "Failed to create repo");
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border border-gray-800 rounded-lg bg-gray-900/50">
      <h2 className="text-xl font-bold mb-2">Choose a repository</h2>
      <p className="text-gray-400 text-sm mb-6">
        Select an existing repo or create a new one to receive your scheduled commits.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("existing")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
            mode === "existing" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          Use Existing Repo
        </button>
        <button
          onClick={() => setMode("new")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
            mode === "new" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          Create New Repo
        </button>
      </div>

      {mode === "existing" ? (
        <div>
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm mb-4"
          >
            <option value="">Select a repository</option>
            {repos.map((repo) => (
              <option key={repo.fullName} value={repo.name}>
                {repo.fullName} {repo.private ? "(private)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={handleUseExisting}
            disabled={loading || !selectedRepo}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-md font-medium"
          >
            {loading ? "Saving..." : "Use This Repo"}
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="e.g. daily-commits"
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-sm mb-4"
          />
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              id="private"
            />
            <label htmlFor="private" className="text-sm text-gray-400">
              Make this repo private
            </label>
          </div>
          <button
            onClick={handleCreateNew}
            disabled={loading || !newRepoName}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-md font-medium"
          >
            {loading ? "Creating..." : "Create & Use This Repo"}
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
    </div>
  );
}