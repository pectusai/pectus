"use client";

import { useEffect, useId, useRef, useState } from "react";

export function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex align-baseline">
      <button
        type="button"
        aria-label={text}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-zinc-300 bg-white text-[9px] font-bold leading-none text-zinc-500 hover:border-zinc-500 hover:text-zinc-900"
      >
        ?
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          onMouseLeave={() => setOpen(false)}
          className="absolute left-1/2 top-[calc(100%+6px)] z-50 w-72 -translate-x-1/2 rounded-md border border-zinc-200 bg-white p-3 text-left text-xs font-normal leading-5 text-zinc-700 shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
