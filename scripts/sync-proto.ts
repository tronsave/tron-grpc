/**
 * Sync the newest .proto definitions from the official TRON protocol repo
 * (https://github.com/tronprotocol/protocol) into this project's src/proto tree.
 *
 * The upstream protos are NOT used verbatim: this project vendors them with a few
 * deliberate transformations so they generate cleanly with ./gen-ts.sh (which runs
 * protoc with only `--proto_path ./`, i.e. no googleapis include path). This script
 * reproduces those transformations so the result stays buildable:
 *
 *   1. Rewrite import paths   "core/..." / "api/..."        -> "src/proto/..."
 *   2. Drop google imports    `import "google/..."`         (any.proto, api/annotations.proto)
 *   3. Vendor Any (Tron.proto) `google.protobuf.Any`        -> a local `message Any`
 *   4. Strip HTTP gateway opts `option (google.api.http){}`  blocks from API.proto
 *   5. Strip codegen options  `option java_*` / `go_package` lines
 *
 * Usage:
 *   npm run sync-proto              # sync from the default branch (master)
 *   npm run sync-proto v4.7.7       # sync from a tag/branch/commit
 *   TRON_PROTO_REF=master npm run sync-proto
 *
 * After syncing, regenerate the TypeScript bindings with `./gen-ts.sh`.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const REPO = "tronprotocol/protocol";
const REF = process.argv[2] ?? process.env.TRON_PROTO_REF ?? "master";
const RAW = (path: string) => `https://raw.githubusercontent.com/${REPO}/${REF}/${path}`;
const ROOT = resolve(import.meta.dirname, "..");

/** Top-level files whose remote name/location differs from the local one. */
const TOP_LEVEL: ReadonlyArray<{ remote: string; local: string }> = [
  { remote: "core/Tron.proto", local: "src/proto/Tron.proto" },
  { remote: "core/Discover.proto", local: "src/proto/Discover.proto" },
  { remote: "api/api.proto", local: "src/proto/API.proto" }, // note: API.proto, capitalized
];

/** The vendored replacement for google.protobuf.Any (used by Tron.proto). */
const VENDORED_ANY = `
message Any {
  string type_url = 1;
  bytes value = 2;
}
`;

/** Discover every core/contract/*.proto in the repo so newly-added contracts sync too. */
async function listContractProtos(): Promise<string[]> {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${REF}?recursive=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "tron-grpc-sync" },
  });
  if (!res.ok) throw new Error(`GitHub tree API ${res.status} for ${url}`);
  const tree = (await res.json()) as { tree: { path: string }[] };
  return tree.tree
    .map((e) => e.path)
    .filter((p) => /^core\/contract\/[^/]+\.proto$/.test(p))
    .sort();
}

/** Remove the matching `option (google.api.http) = { ... };` block (handles nested braces). */
function stripHttpOptions(src: string): string {
  const marker = "option (google.api.http) = {";
  for (let idx = src.indexOf(marker); idx !== -1; idx = src.indexOf(marker)) {
    const open = idx + marker.length - 1; // position of the '{'
    let depth = 0;
    let end = -1;
    for (let j = open; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}" && --depth === 0) {
        end = j;
        break;
      }
    }
    if (end === -1) throw new Error("unbalanced braces in google.api.http option");
    let after = src[end + 1] === ";" ? end + 2 : end + 1;
    // Drop the option's own line entirely: backtrack to line start, consume trailing newline.
    let start = idx;
    while (start > 0 && src[start - 1] !== "\n") start--;
    while (after < src.length && (src[after] === " " || src[after] === "\t")) after++;
    if (src[after] === "\n") after++;
    src = src.slice(0, start) + src.slice(after);
  }
  return src;
}

function transform(remote: string, text: string): string {
  const kept = text.split("\n").filter((line) => {
    const t = line.trim();
    if (/^import\s+"google\//.test(t)) return false;
    if (/^option\s+(java_package|java_outer_classname|go_package)\b/.test(t)) return false;
    return true;
  });
  let out = kept.join("\n").replace(/import\s+"(core|api)\//g, 'import "src/proto/');

  if (remote === "core/Tron.proto") {
    out = out.replace(/google\.protobuf\.Any/g, "Any");
    if (!/\bmessage\s+Any\b/.test(out)) out = `${out.replace(/\s*$/, "")}\n${VENDORED_ANY}`;
  }
  if (remote === "api/api.proto") out = stripHttpOptions(out);

  // Safety net: surface anything we didn't normalize rather than silently shipping a broken proto.
  const stray = out.match(/import\s+"(google|core|api)\/[^"]*"/g);
  if (stray) throw new Error(`${remote}: unhandled import(s): ${stray.join(", ")}`);
  if (/google\.protobuf\.(?!Any\b)\w/.test(out))
    console.warn(`  ! ${remote}: references a google.protobuf.* type with no local include`);
  return out;
}

async function syncOne(remote: string, local: string): Promise<"updated" | "unchanged"> {
  const res = await fetch(RAW(remote), { headers: { "User-Agent": "tron-grpc-sync" } });
  if (!res.ok) throw new Error(`fetch ${remote}: HTTP ${res.status}`);
  const next = transform(remote, await res.text());
  const path = resolve(ROOT, local);
  const prev = await readFile(path, "utf8").catch(() => null);
  if (prev === next) return "unchanged";
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next);
  return "updated";
}

async function main() {
  console.log(`Syncing TRON protos from ${REPO}@${REF}\n`);
  const contracts = (await listContractProtos()).map((remote) => ({
    remote,
    local: remote.replace(/^core\//, "src/proto/"),
  }));
  const files = [...TOP_LEVEL, ...contracts];

  const results = await Promise.all(
    files.map(async ({ remote, local }) => {
      const status = await syncOne(remote, local);
      console.log(`  ${status === "updated" ? "✓" : "·"} ${local}${status === "updated" ? "" : " (unchanged)"}`);
      return status;
    }),
  );

  const updated = results.filter((r) => r === "updated").length;
  console.log(`\nDone: ${updated} updated, ${results.length - updated} unchanged.`);
  if (updated) console.log("Next: run ./gen-ts.sh to regenerate the TypeScript bindings.");
}

main().catch((err) => {
  console.error(`\nsync-proto failed: ${err.message}`);
  process.exit(1);
});
