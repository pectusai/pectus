import { Octokit } from "@octokit/rest";

/* GitHub connector for Pectus.
 *
 * Used by the publish pipeline to commit page JSON, the site-plan tree, and
 * the redirect map directly to the user's content-hub repo. The repo identity
 * (owner/repo/branch) lives on the workspace; auth is a personal access token
 * in GITHUB_TOKEN env (repo scope required).
 *
 * Multi-file commits use the Git Database API (createBlob → createTree →
 * createCommit → updateRef) so a publish lands as a single atomic commit.
 *
 * connectors/github/client.ts
 */

let cached: Octokit | null = null;

export function getGitHub(): Octokit {
  if (!cached) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        "GITHUB_TOKEN is not configured. Generate a personal access token with `repo` scope and set it in your env.",
      );
    }
    cached = new Octokit({ auth: token });
  }
  return cached;
}

export type RepoTarget = {
  owner: string;
  repo: string;
  branch: string;
};

export type FileChange =
  | { path: string; mode?: "100644" | "100755"; content: string }
  | { path: string; delete: true };

/* ------------------------------------------------------------------------- *
 * Read primitives
 * ------------------------------------------------------------------------- */

/** Read a file's text content from a repo. Returns null if the file doesn't exist. */
export async function getFile(
  target: RepoTarget,
  path: string,
): Promise<{ content: string; sha: string } | null> {
  const gh = getGitHub();
  try {
    const res = await gh.repos.getContent({
      owner: target.owner,
      repo: target.repo,
      path,
      ref: target.branch,
    });
    if (Array.isArray(res.data) || !("content" in res.data)) {
      return null;
    }
    const content = Buffer.from(res.data.content, "base64").toString("utf8");
    return { content, sha: res.data.sha };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return null;
    throw err;
  }
}

/** Check whether a repo exists and the configured branch is reachable. */
export async function checkRepo(
  target: RepoTarget,
): Promise<{ ok: true; defaultBranch: string } | { ok: false; reason: string }> {
  const gh = getGitHub();
  try {
    const repo = await gh.repos.get({ owner: target.owner, repo: target.repo });
    try {
      await gh.repos.getBranch({
        owner: target.owner,
        repo: target.repo,
        branch: target.branch,
      });
    } catch {
      return {
        ok: false,
        reason: `Branch ${target.branch} not found in ${target.owner}/${target.repo}.`,
      };
    }
    return { ok: true, defaultBranch: repo.data.default_branch };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return {
        ok: false,
        reason: `Repo ${target.owner}/${target.repo} not found, or token lacks access.`,
      };
    }
    return { ok: false, reason: (err as Error).message };
  }
}

/* ------------------------------------------------------------------------- *
 * Write primitives — multi-file atomic commit via Git Database API
 * ------------------------------------------------------------------------- */

/** Commit a set of changes (creates, updates, deletes) as a single commit. */
export async function commitChanges(
  target: RepoTarget,
  changes: FileChange[],
  message: string,
): Promise<{ sha: string }> {
  if (changes.length === 0) {
    throw new Error("commitChanges called with no changes.");
  }
  const gh = getGitHub();
  const { owner, repo, branch } = target;

  /* 1. Resolve the latest commit + tree on the branch. */
  const ref = await gh.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const baseCommitSha = ref.data.object.sha;

  const baseCommit = await gh.git.getCommit({
    owner,
    repo,
    commit_sha: baseCommitSha,
  });
  const baseTreeSha = baseCommit.data.tree.sha;

  /* 2. Build tree entries. For deletes we set sha=null. For writes we create
   * a blob and reference its sha. */
  const treeEntries: Array<{
    path: string;
    mode: "100644" | "100755";
    type: "blob";
    sha: string | null;
  }> = [];

  for (const change of changes) {
    if ("delete" in change) {
      treeEntries.push({
        path: change.path,
        mode: "100644",
        type: "blob",
        sha: null,
      });
      continue;
    }
    const blob = await gh.git.createBlob({
      owner,
      repo,
      content: Buffer.from(change.content, "utf8").toString("base64"),
      encoding: "base64",
    });
    treeEntries.push({
      path: change.path,
      mode: change.mode ?? "100644",
      type: "blob",
      sha: blob.data.sha,
    });
  }

  /* 3. Create the new tree. */
  const tree = await gh.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: treeEntries,
  });

  /* 4. Create the commit. */
  const commit = await gh.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.data.sha,
    parents: [baseCommitSha],
  });

  /* 5. Move the branch ref. */
  await gh.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
  });

  return { sha: commit.data.sha };
}

/* ------------------------------------------------------------------------- *
 * Convenience wrappers around commitChanges for the publish flow
 * ------------------------------------------------------------------------- */

export async function commitPagePublish(
  target: RepoTarget,
  args: {
    pagePath: string;
    pageJson: string;
    sitePlanPath: string;
    sitePlanJson: string;
    redirectsPath: string;
    redirectsJson: string;
    title: string;
    workspaceCode: string;
  },
): Promise<{ sha: string }> {
  return commitChanges(
    target,
    [
      { path: args.pagePath, content: args.pageJson },
      { path: args.sitePlanPath, content: args.sitePlanJson },
      { path: args.redirectsPath, content: args.redirectsJson },
    ],
    `content: publish "${args.title}" (${args.workspaceCode})`,
  );
}

export async function commitPageUnpublish(
  target: RepoTarget,
  args: {
    pagePath: string;
    sitePlanPath: string;
    sitePlanJson: string;
    redirectsPath: string;
    redirectsJson: string;
    title: string;
    workspaceCode: string;
  },
): Promise<{ sha: string }> {
  return commitChanges(
    target,
    [
      { path: args.pagePath, delete: true },
      { path: args.sitePlanPath, content: args.sitePlanJson },
      { path: args.redirectsPath, content: args.redirectsJson },
    ],
    `content: unpublish "${args.title}" (${args.workspaceCode})`,
  );
}
