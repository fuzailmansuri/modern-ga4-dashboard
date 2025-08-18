"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }
  if (!session) {
    return <div className="p-6">Please sign in to use chat.</div>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setAnswer(data.answer ?? "");
    } catch (err) {
      setAnswer(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-4">Analytics Chat</h1>
        <form onSubmit={submit} className="flex gap-2 mb-4">
          <input
            className="flex-1 rounded border border-gray-300 px-3 py-2"
            placeholder="Ask about your analytics..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Asking..." : "Ask"}
          </button>
        </form>
        {answer && (
          <div className="rounded bg-white p-4 shadow whitespace-pre-wrap">
            {answer}
          </div>
        )}
      </div>
    </main>
  );
}


