"use client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  confidence?: number;
  escalated?: boolean;
}

interface ConversationThreadProps {
  messages: Message[];
}

export function ConversationThread({ messages }: ConversationThreadProps) {
  return (
    <div className="space-y-3 p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[75%] px-4 py-2 rounded-lg text-sm ${
              msg.role === "user"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <p>{msg.content}</p>
            {msg.role === "assistant" && msg.confidence !== undefined && (
              <p className="text-xs opacity-60 mt-1">
                Confidence: {(msg.confidence * 100).toFixed(0)}%
                {msg.escalated && " • Escalated"}
              </p>
            )}
            <p className="text-xs opacity-40 mt-1">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
