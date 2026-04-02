"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { KnowledgeBaseEditor } from "@/components/KnowledgeBaseEditor";

interface KnowledgeChunk {
  id: string;
  content: string;
  sourceType: string;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<KnowledgeChunk[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const merchantId = (session?.user as any)?.merchantId;

  useEffect(() => {
    if (status === "authenticated" && merchantId) {
      loadEntries();
    }
  }, [status, merchantId]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/kb?merchantId=${merchantId}&limit=50`);
      const data = await res.json();
      if (data.ok) {
        setEntries(data.data.entries);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error("Failed to load KB:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string, content: string) => {
    const res = await fetch(`/api/kb/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      await loadEntries();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/kb/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadEntries();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Knowledge Base</h2>
        <p className="text-sm text-text-secondary mt-1">
          {total} entries — Manage your AI training data
        </p>
      </div>
      <KnowledgeBaseEditor
        entries={entries}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
