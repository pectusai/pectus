"use client";

import { useState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { saveIcp, type Persona, type Painpoint } from "./actions";

type Props = {
  code: string;
  initialPersonas: Persona[];
  initialPainpoints: Painpoint[];
  initialNotes: string;
};

const EMPTY_PERSONA: Persona = {
  name: "",
  role: "",
  industry: "",
  company_size: "",
  challenges: [],
  goals: [],
};

function csvToList(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function IcpEditor({
  code,
  initialPersonas,
  initialPainpoints,
  initialNotes,
}: Props) {
  const [personas, setPersonas] = useState<Persona[]>(
    initialPersonas.length > 0 ? initialPersonas : [EMPTY_PERSONA],
  );
  const [painpoints, setPainpoints] = useState<Painpoint[]>(
    initialPainpoints.length > 0
      ? initialPainpoints
      : [{ title: "", description: "" }],
  );
  const [notes, setNotes] = useState(initialNotes);

  const updatePersona = (
    index: number,
    field: keyof Persona,
    value: string | string[],
  ) =>
    setPersonas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );

  const updatePainpoint = (
    index: number,
    field: keyof Painpoint,
    value: string,
  ) =>
    setPainpoints((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );

  return (
    <form action={saveIcp} className="space-y-10">
      <input type="hidden" name="code" value={code} />
      <input
        type="hidden"
        name="personas"
        value={JSON.stringify(
          personas.filter(
            (p) => p.name || p.role || p.industry || p.company_size,
          ),
        )}
      />
      <input
        type="hidden"
        name="painpoints"
        value={JSON.stringify(
          painpoints.filter((p) => p.title || p.description),
        )}
      />
      <input type="hidden" name="notes" value={notes} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Personas</h2>
          <button
            type="button"
            onClick={() => setPersonas((prev) => [...prev, EMPTY_PERSONA])}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
          >
            + Add persona
          </button>
        </div>
        <div className="space-y-4">
          {personas.map((p, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Persona {i + 1}
                </p>
                {personas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPersonas((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    value={p.name}
                    onChange={(e) => updatePersona(i, "name", e.target.value)}
                    placeholder="e.g. Hiring-strapped Head of People"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Role / title">
                  <input
                    value={p.role}
                    onChange={(e) => updatePersona(i, "role", e.target.value)}
                    placeholder="e.g. VP People"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Industry">
                  <input
                    value={p.industry}
                    onChange={(e) =>
                      updatePersona(i, "industry", e.target.value)
                    }
                    placeholder="e.g. SaaS, retail, healthcare"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Company size">
                  <input
                    value={p.company_size}
                    onChange={(e) =>
                      updatePersona(i, "company_size", e.target.value)
                    }
                    placeholder="e.g. 50-250"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </Field>
              </div>
              <Field label="Challenges (comma or newline separated)">
                <textarea
                  value={p.challenges?.join("\n") ?? ""}
                  onChange={(e) =>
                    updatePersona(i, "challenges", csvToList(e.target.value))
                  }
                  rows={3}
                  placeholder="What goes wrong, what they get stuck on."
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Goals (comma or newline separated)">
                <textarea
                  value={p.goals?.join("\n") ?? ""}
                  onChange={(e) =>
                    updatePersona(i, "goals", csvToList(e.target.value))
                  }
                  rows={3}
                  placeholder="What they're trying to make true this quarter."
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Painpoints</h2>
          <button
            type="button"
            onClick={() =>
              setPainpoints((prev) => [...prev, { title: "", description: "" }])
            }
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
          >
            + Add painpoint
          </button>
        </div>
        <div className="space-y-4">
          {painpoints.map((p, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Painpoint {i + 1}
                </p>
                {painpoints.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPainpoints((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <Field label="Title">
                <input
                  value={p.title}
                  onChange={(e) => updatePainpoint(i, "title", e.target.value)}
                  placeholder="e.g. Candidates ghost after offer"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={p.description}
                  onChange={(e) =>
                    updatePainpoint(i, "description", e.target.value)
                  }
                  rows={3}
                  placeholder="What goes wrong, how often, what it costs."
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Anything that doesn't fit above but the skills should know."
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
      </section>

      <div>
        <SubmitButton
          pendingLabel="Saving ICP…"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Save ICP
        </SubmitButton>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-3 block text-sm">
      <span className="mb-1 block text-xs font-medium text-zinc-600">
        {label}
      </span>
      {children}
    </label>
  );
}
