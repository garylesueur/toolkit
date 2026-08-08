import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { TOOL_PROCESSING, getToolProcessing } from "../lib/tool-processing.ts";
import { tools } from "../lib/tools.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

const REMOTE_FETCH_SOURCES: Readonly<Record<string, string>> = {
  "app/tools/my-ip/page.tsx": "/tools/my-ip",
  "lib/dns/doh.ts": "/tools/domain-inspector",
  "lib/ip/probe.ts": "/tools/my-ip",
  "lib/og-preview/parse.ts": "/tools/og-preview",
  "lib/rdap/bootstrap.ts": "/tools/domain-inspector",
  "lib/rdap/query.ts": "/tools/domain-inspector",
};

const LOCAL_ASSET_FETCH_SOURCES: Readonly<Record<string, string>> = {
  "lib/markdown-pdf/generate-client.ts": "/tools/markdown-to-pdf",
  "lib/pdf/compress.worker.ts": "/tools/compress-pdf",
  "lib/pdf/pdf-health.worker.ts": "/tools/pdf-validator",
  "lib/pdf/pdf-password.worker.ts": "/tools/protect-pdf",
};

function sourceFiles(directory: string): string[] {
  return readdirSync(path.join(ROOT, directory), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (relative === "lib/pdf/vendor") return [];
      return sourceFiles(relative);
    }
    return /\.(?:ts|tsx)$/.test(entry.name) ? [relative] : [];
  });
}

test("every catalogued tool has exactly one explicit processing boundary", () => {
  const catalogueHrefs = tools.map((tool) => tool.href).sort();
  const classifiedHrefs = Object.keys(TOOL_PROCESSING).sort();
  assert.deepEqual(classifiedHrefs, catalogueHrefs);
  assert.equal(new Set(catalogueHrefs).size, catalogueHrefs.length);
});

test("network classifications name their recipients and do not claim locality", () => {
  const networkEntries = Object.values(TOOL_PROCESSING).filter(
    (processing) => processing.kind !== "local",
  );
  assert.equal(networkEntries.length, 4);
  for (const processing of networkEntries) {
    assert.ok(processing.recipients.length > 0);
    assert.notEqual(processing.label, "Browser only");
    assert.match(processing.summary, /browser|server/i);
  }
});

test("the only first-party processing tool is the public IP lookup", () => {
  const serverTools = tools.filter(
    (tool) => getToolProcessing(tool.href).kind === "first-party-server",
  );
  assert.deepEqual(
    serverTools.map((tool) => tool.href),
    ["/tools/my-ip"],
  );
});

test("raw fetch calls stay confined to reviewed network or static-asset modules", () => {
  const discovered = ["app", "components", "hooks", "lib"]
    .flatMap(sourceFiles)
    .filter((relative) =>
      /\bfetch\s*\(/.test(readFileSync(path.join(ROOT, relative), "utf8")),
    )
    .sort();
  const reviewed = [
    ...Object.keys(REMOTE_FETCH_SOURCES),
    ...Object.keys(LOCAL_ASSET_FETCH_SOURCES),
  ].sort();
  assert.deepEqual(discovered, reviewed);
});

test("reviewed remote fetch modules belong only to disclosed network tools", () => {
  for (const owner of Object.values(REMOTE_FETCH_SOURCES)) {
    assert.notEqual(getToolProcessing(owner).kind, "local");
  }
});

test("local fetch exceptions can request only same-origin static assets", () => {
  for (const [relative, owner] of Object.entries(LOCAL_ASSET_FETCH_SOURCES)) {
    assert.equal(getToolProcessing(owner).kind, "local");
    const source = readFileSync(path.join(ROOT, relative), "utf8");
    assert.doesNotMatch(source, /https?:\/\//i);
    assert.doesNotMatch(source, /["'`]\/api\//i);
  }
});

test("no source introduces an unreviewed upload or streaming transport", () => {
  const riskyTransport =
    /\b(?:XMLHttpRequest|FormData|WebSocket|EventSource)\b|\.sendBeacon\s*\(|method\s*:\s*["'`](?:POST|PUT|PATCH)["'`]/;
  const offenders = ["app", "components", "hooks", "lib"]
    .flatMap(sourceFiles)
    .filter((relative) =>
      riskyTransport.test(readFileSync(path.join(ROOT, relative), "utf8")),
    );
  assert.deepEqual(offenders, []);
});
