"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@replybase/ui";
import { trpc } from "@/lib/trpc";

interface ChatSession {
  id: string;
  visitorId: string;
  escalated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function ConversationsPage() {
  const { status } = useSession();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      try {
        if (status !== "authenticated") return;

        const result = await trpc.conversations.listSessions.query({
          escalatedOnly,
          limit: 20,
        });
        setSessions(result.sessions as any);
      } catch (error) {
        console.error("Failed to load sessions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [status, escalatedOnly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-text-primary">
          Conversations
        </h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={escalatedOnly}
            onChange={(e) => setEscalatedOnly(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-text-secondary">
            Escalated Only
          </span>
        </label>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-text-secondary">
              No conversations yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition">
              <a href={`/dashboard/conversations/${session.id}`}>
                <CardContent className="pt-6 flex justify-between items-center cursor-pointer">
                  <div>
                    <p className="font-medium text-text-primary">
                      {session.visitorId}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {new Date(session.createdAt).toLocaleDateString()} at{" "}
                      {new Date(session.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    {session.escalated && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        Escalated
                      </span>
                    )}
                  </div>
                </CardContent>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
