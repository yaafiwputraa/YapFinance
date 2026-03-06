"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/cron/sync-emails", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setResult(`Error: ${data.error}`);
      } else {
        const parts = [`✓ ${data.processed} baru`, `${data.skipped} sudah ada`];
        if (data.failed > 0) parts.push(`${data.failed} gagal`);
        setResult(parts.join(", "));
        if (data.errors?.length > 0) {
          console.error("[Sync errors]", data.errors);
        }
        router.refresh();
      }
    } catch (e: unknown) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-xs text-zinc-400">{result}</span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? "Syncing..." : "⟳ Sync Email"}
      </button>
    </div>
  );
}
