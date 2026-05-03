export function InfoDot({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-zinc-300 text-[9px] font-bold text-zinc-500"
    >
      ?
    </span>
  );
}
