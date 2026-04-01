"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@replybase/ui";
import { trpc } from "@/lib/trpc";
import { LoadingSpinner } from "@replybase/ui";
import { useToast } from "@/lib/use-toast";

interface KnowledgeChunk {
  id: string;
  content: string;
  sourceType: string;
  createdAt: Date;
}

interface SearchResult {
  id?: string;
  content: string;
  similarity: number;
}

export default function KnowledgePage() {
  const { status } = useSession();
  const toast = useToast();
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [category, setCategory] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      loadChunks();
    }
  }, [status]);

  const loadChunks = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await trpc.tickets.listChunks.query({ limit: 20 });
      setChunks(result.chunks as any);
    } catch (err) {
      setError("Failed to load knowledge base");
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setAddLoading(true);

    try {
      await trpc.tickets.addManualChunk.mutate({
        content: newContent,
        category,
      });
      setNewContent("");
      setCategory("");
      setShowAddForm(false);
      await loadChunks();
      toast.success("Knowledge added successfully");
    } catch (err) {
      setError("Failed to add chunk");
      toast.error("Failed to add chunk", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setAddLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      const results = await trpc.tickets.searchChunks.query({
        query: searchQuery,
        limit: 10,
      });
      setSearchResults(results as any);
      if (results.length === 0) {
        toast.message("No results found");
      }
    } catch (err) {
      setError("Search failed");
      toast.error("Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteChunk = async (chunkId: string) => {
    if (!confirm("Delete this chunk?")) return;

    try {
      await trpc.tickets.deleteChunk.mutate({ chunkId });
      await loadChunks();
      toast.success("Chunk deleted successfully");
    } catch (err) {
      setError("Failed to delete chunk");
      toast.error("Failed to delete chunk", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Knowledge Base
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Manage your AI training data
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "+ Add Chunk"}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Add Chunk Form */}
      {showAddForm && (
        <Card className="p-6">
          <form onSubmit={handleAddChunk} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Content
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Enter knowledge content..."
                className="w-full p-3 mt-2 border border-gray-300 rounded-lg resize-none"
                rows={4}
                disabled={addLoading}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary">
                Category
              </label>
              <Input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Product Info, Shipping, Returns"
                disabled={addLoading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddForm(false)}
                disabled={addLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? "Adding..." : "Add Chunk"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search Form */}
      <Card className="p-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
          />
          <Button type="submit" disabled={searching} className="whitespace-nowrap">
            {searching ? "Searching..." : "Search"}
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-text-secondary">
              Found {searchResults.length} results
            </p>
            {searchResults.map((result) => (
              <div key={result.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-text-primary">{result.content}</p>
                <p className="text-xs text-text-secondary mt-1">
                  Similarity: {(result.similarity * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Chunks List */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-text-primary">
          All Chunks ({chunks.length})
        </h3>

        {chunks.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-text-secondary">
              No chunks yet. Add one to get started!
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {chunks.map((chunk) => (
              <Card key={chunk.id} className="hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-text-primary line-clamp-2">
                        {chunk.content}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {chunk.sourceType}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {new Date(chunk.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteChunk(chunk.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
