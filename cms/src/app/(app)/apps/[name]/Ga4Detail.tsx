import {
  GoogleConnectionPanel,
  type GoogleIntegration,
} from "./GoogleConnectionPanel";
import { SubmitButton } from "@/app/components/SubmitButton";
import { saveGa4 } from "./actions";

export function Ga4Detail({
  integration,
}: {
  integration: GoogleIntegration;
}) {
  const connected = Boolean(integration?.service_account_json);
  const propertyId = (integration as { ga4_property_id?: string } | null)
    ?.ga4_property_id;

  return (
    <div className="space-y-5">
      <GoogleConnectionPanel integration={integration} />

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            GA4 property
          </h2>
          {propertyId ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
              Saved
            </span>
          ) : null}
        </header>
        <p className="mt-2 text-sm text-zinc-700">
          Tell Pectus which GA4 property feeds this install.
        </p>

        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            Open{" "}
            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Google Analytics
            </a>{" "}
            and switch to the property you want Pectus to read from.
          </li>
          <li>
            Bottom-left gear → <strong>Admin</strong> →{" "}
            <strong>Property settings</strong>. Copy the{" "}
            <strong>Property ID</strong> (a number like{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">123456789</code>
            ). Not the &ldquo;Measurement ID&rdquo; (which starts with G-).
          </li>
          <li>
            Paste the property ID below and click{" "}
            <strong>Test + save</strong>. Pectus runs a live API call against
            it; if the service account isn&apos;t a Viewer on the property,
            you&apos;ll get the Google error verbatim and the save aborts.
          </li>
        </ol>

        {!connected ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Connect Google first.</strong> Scroll up to the Google
            Cloud connection panel and upload your service account JSON.
          </div>
        ) : (
          <form action={saveGa4} className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-zinc-700">
              Property ID
            </label>
            <input
              type="text"
              name="ga4_property_id"
              defaultValue={propertyId ?? ""}
              placeholder="123456789"
              required
              inputMode="numeric"
              pattern="\d+"
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm sm:max-w-xs"
            />
            <SubmitButton
              pendingLabel="Testing + saving…"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Test + save (activates GA4)
            </SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
