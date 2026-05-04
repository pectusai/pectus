// Pectus CLI entry point.
// Stub. Full implementation lands in PR5.

import { Command } from "commander";

const program = new Command();

program
  .name("pectus")
  .description("Pectus CLI — install, connect, run skills, update")
  .version("0.1.0");

program
  .command("init")
  .description("Install orchestrator (called from pectus.md)")
  .action(async () => {
    const { run } = await import("./commands/init.js");
    await run();
  });

const brand = program.command("brand").description("Brand management");
brand
  .command("setup")
  .description("Interactive brand setup (writes brands/<slug>/brand.json)")
  .action(async () => {
    const { run } = await import("./commands/brand.js");
    await run();
  });
brand
  .command("sync")
  .description("Push every brands/<slug>/brand.json on disk into Supabase")
  .action(async () => {
    const { sync } = await import("./commands/brand.js");
    await sync();
  });
// Back-compat: bare `pectus brand` runs the interactive setup as before.
brand.action(async () => {
  const { run } = await import("./commands/brand.js");
  await run();
});

const connect = program.command("connect").description("Connect external services");
for (const service of ["supabase", "google", "vercel", "github"] as const) {
  connect
    .command(service)
    .description(`Connect ${service}`)
    .action(async () => {
      const { run } = await import("./commands/connect.js");
      await run(service);
    });
}

const project = program.command("project").description("Project management");
project
  .command("create")
  .description("Create a project")
  .action(async () => {
    const { create } = await import("./commands/project.js");
    await create();
  });
project
  .command("list")
  .description("List projects")
  .action(async () => {
    const { list } = await import("./commands/project.js");
    await list();
  });

const workspaceAlias = program
  .command("workspace")
  .description("Alias for `pectus project` (deprecated, removed in v0.5)");
workspaceAlias
  .command("create")
  .description("Create a project (alias)")
  .action(async () => {
    const { create } = await import("./commands/project.js");
    await create();
  });
workspaceAlias
  .command("list")
  .description("List projects (alias)")
  .action(async () => {
    const { list } = await import("./commands/project.js");
    await list();
  });

program
  .command("analyze")
  .description("Run a skill against a project")
  .requiredOption("--project <code>", "Project code")
  .requiredOption("--skill <name>", "Skill name")
  .action(async (opts) => {
    const { run } = await import("./commands/analyze.js");
    await run(opts);
  });

const knowledge = program.command("knowledge").description("Knowledge layer ops");
knowledge
  .command("digest")
  .description("Run the knowledge-digest skill")
  .action(async () => {
    const { run } = await import("./commands/analyze.js");
    await run({ skill: "knowledge-digest", project: "global" });
  });

program
  .command("doctor")
  .description("Health check")
  .action(async () => {
    const { run } = await import("./commands/doctor.js");
    await run();
  });

program
  .command("update")
  .description("Pull upstream + run migrations")
  .action(async () => {
    const { run } = await import("./commands/update.js");
    await run();
  });

program.parseAsync(process.argv);
