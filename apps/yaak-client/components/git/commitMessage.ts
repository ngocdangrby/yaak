import type { GitStatus, GitStatusEntry, SyncModel } from "@yaakapp-internal/git";
import { resolvedModelName } from "../../lib/resolvedModelName";

const VERB_ORDER = ["added", "updated", "renamed", "deleted"] as const;

type Verb = (typeof VERB_ORDER)[number];

/**
 * Build a commit message from the staged changes, with one `<verb>: <name>` line per change. For
 * example:
 *
 *     added: user-segment.com/get
 *     updated: abc.com/post
 */
export function generateCommitMessage(entries: GitStatusEntry[], relaDir: string): string {
  const lines: string[] = [];

  for (const verb of VERB_ORDER) {
    for (const entry of entries) {
      if (!entry.staged) continue;
      if (statusVerb(entry.status) !== verb) continue;

      const line = `${verb}: ${entryName(entry, relaDir)}`;
      if (!lines.includes(line)) lines.push(line);
    }
  }

  return lines.join("\n");
}

function statusVerb(status: GitStatus): Verb | null {
  switch (status) {
    case "untracked":
      return "added";
    case "modified":
    case "conflict":
    case "type_change":
      return "updated";
    case "renamed":
      return "renamed";
    case "removed":
      return "deleted";
    case "current":
      return null;
  }
}

function entryName(entry: GitStatusEntry, relaDir: string): string {
  const model = entry.next ?? entry.prev;
  if (model != null) {
    return modelName(model);
  }

  // Files not managed by Yaak only have a path to show
  return entry.relaPath.startsWith(`${relaDir}/`)
    ? entry.relaPath.slice(relaDir.length + 1)
    : entry.relaPath;
}

function modelName(model: SyncModel): string {
  const name = resolvedModelName(model);

  // Requests named after their URL also get the method, so the line reads like an API
  // endpoint (eg. `user-segment.com/get`)
  if (model.model === "http_request" && !model.name.trim()) {
    return `${name}/${model.method.toLowerCase()}`;
  }

  return name;
}
