"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  className,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...rest}
      disabled={disabled || pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`.trim()}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
