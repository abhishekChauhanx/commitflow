"use client";

import { useState } from "react";

export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch("/api/account/delete", { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setLoading(false);
      alert("Failed to delete account");
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-sm"
      >
        Delete Account
      </button>
    );
  }

  return (
    <div className="border border-red-900/50 rounded-lg p-4 bg-red-950/20">
      <p className="text-sm text-red-300 mb-3">
        This permanently deletes your account and all commit history. This
        cannot be undone. Are you sure?
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-md text-sm font-medium"
        >
          {loading ? "Deleting..." : "Yes, delete my account"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}