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

  const submit = () => {
    if (!input.trim() || pending) return;
    const instruction = input.trim();
    setInput("");
    setError(null);

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ul className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4">
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
        <p className="mx-4 text-xs text-red-600">{error}</p>
      )}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="What should change? Enter sends, Shift+Enter adds a new line."
          disabled={pending}
          rows={3}
          className="resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-stretch rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 disabled:cursor-wait disabled:bg-zinc-700 disabled:opacity-100"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
