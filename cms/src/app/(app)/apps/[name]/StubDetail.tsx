export function StubDetail({
  appName,
  message,
}: {
  appName: string;
  message: string;
}) {
  return (
    <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-900">
        Settings for {appName}
      </h2>
      <p className="mt-2 max-w-prose text-sm text-zinc-600">{message}</p>
    </section>
  );
}
