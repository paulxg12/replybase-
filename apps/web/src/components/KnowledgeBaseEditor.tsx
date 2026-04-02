"use client";

import { useState } from "react";

interface KnowledgeEntry {
  id: string;
  content: string;
  sourceType: string;
  createdAt: string;
}

interface KnowledgeBaseEditorProps {
  entries: KnowledgeEntry[];
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KnowledgeBaseEditor({ entries, onEdit, onDelete }: KnowledgeBaseEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const startEditing = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const handleSave = async () => {
    if (editingId && editContent.trim()) {
      await onEdit(editingId, editContent);
      setEditingId(null);
      setEditContent("");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this entry?")) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-text-secondary">No entries yet. Sync your Gorgias data or add entries manually.</p>
        </div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
            {editingId === entry.id ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm"
                  rows={4}
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-3 py-1 bg-brand-500 text-white text-sm rounded-md">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 border text-sm rounded-md">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-text-primary line-clamp-3">{entry.content}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {entry.sourceType}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditing(entry)} className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
