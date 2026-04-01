"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@replybase/ui";
import { trpc } from "@/lib/trpc";

export default function OverviewPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [conversationStats, setConversationStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        if (status !== "authenticated") return;

        // Fetch merchant stats
        const merchantStats = await trpc.merchants.getStats.query();
        setStats(merchantStats);

        // Fetch conversation stats
        const convStats = await trpc.conversations.getStats.query();
        setConversationStats(convStats);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  const deflectionRate = conversationStats
    ? (
        ((conversationStats.totalSessions - conversationStats.escalatedSessions) /
          conversationStats.totalSessions) *
        100
      ).toFixed(1)
    : "–";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary mb-6">
          Dashboard
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Chats This Month</div>
            <div className="text-3xl font-bold text-text-primary mt-2">
              {conversationStats?.sessionsLast30Days || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Tickets Deflected</div>
            <div className="text-3xl font-bold text-success mb-2">
              {conversationStats
                ? conversationStats.totalSessions -
                  conversationStats.escalatedSessions
                : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Deflection Rate</div>
            <div className="text-3xl font-bold text-brand-500">
              {deflectionRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Knowledge Base</div>
            <div className="text-3xl font-bold text-text-primary">
              {stats?.totalKnowledgeChunks || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Total Chats</span>
              <span className="font-semibold text-text-primary">
                {conversationStats?.totalSessions || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">
                Escalated Chats
              </span>
              <span className="font-semibold text-text-primary">
                {conversationStats?.escalatedSessions || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Synced Tickets</span>
              <span className="font-semibold text-text-primary">
                {stats?.totalTickets || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
