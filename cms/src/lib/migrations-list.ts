import fs from "node:fs";
import path from "node:path";

export type Migration = { id: string; filename: string; sql: string };

export function migrationsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "connectors", "supabase", "migrations"),
    path.resolve(process.cwd(), "..", "connectors", "supabase", "migrations"),
    path.resolve(process.cwd(), "..", "..", "connectors", "supabase", "migrations"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

export function listMigrations(): Migration[] {
  const dir = migrationsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((filename) => {
      const sql = fs.readFileSync(path.join(dir, filename), "utf8");
      const id = filename.replace(/\.sql$/, "");
      return { id, filename, sql };
    });
}
