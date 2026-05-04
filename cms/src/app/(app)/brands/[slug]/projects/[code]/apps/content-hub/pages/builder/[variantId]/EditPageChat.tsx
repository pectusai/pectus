"use client";

import { useState, useTransition } from "react";
import { applyEdit, type ChatTurn } from "./actions";

export function EditPageChat({
  projectCode,
  variantId,
  previewIframeId,
}: {
  projectCode: string;
  variantId: string;
  previewIframeId: string;
}) {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const instruction = input.trim();
    setInput("");
    setError(null);

    /* Optimistic: add the user turn immediately. */
    const nextHistory: ChatTurn[] = [
      ...history,
      { role: "user", text: instruction },
    ];
    setHistory(nextHistory);

    startTransition(async () => {
      const result = await applyEdit({
        projectCode,
        variantId,
        instruction,
        chatHistory: history,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHistory((h) => [
        ...h,
        { role: "assistant", text: result.summary },
      ]);
      const iframe = document.getElementById(
        previewIframeId,
      ) as HTMLIFrameElement | null;
      iframe?.contentWindow?.postMessage({ type: "pectus:reload" }, "*");
    });
  };

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <ul className="flex-1 space-y-3 overflow-y-auto pr-2">
        {history.length === 0 && (
          <li className="text-sm text-zinc-500">
            Ask for a change to start. Try &ldquo;make the hero shorter&rdquo;
            or &ldquo;add three feature cards&rdquo;.
          </li>
        )}
        {history.map((turn, i) => (
          <li
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              turn.role === "user"
                ? "bg-zinc-900 text-white ml-6"
                : "bg-zinc-100 text-zinc-900 mr-6"
            }`}
          >
            {turn.text}
          </li>
        ))}
        {pending && (
          <li className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 mr-6 italic">
            Editing…
          </li>
        )}
      </ul>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What should change?"
          disabled={pending}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
