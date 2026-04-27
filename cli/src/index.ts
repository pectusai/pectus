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

program
  .command("brand")
  .description("Interactive brand setup")
  .action(async () => {
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

const workspace = program.command("workspace").description("Workspace management");
workspace
  .command("create")
  .description("Create a workspace")
  .action(async () => {
    const { create } = await import("./commands/workspace.js");
    await create();
  });
workspace
  .command("list")
  .description("List workspaces")
  .action(async () => {
    const { list } = await import("./commands/workspace.js");
    await list();
  });

program
  .command("analyze")
  .description("Run a skill against a workspace")
  .requiredOption("--workspace <code>", "Workspace code")
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
    await run({ skill: "knowledge-digest", workspace: "global" });
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
