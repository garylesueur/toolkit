import assert from "node:assert/strict";
import test from "node:test";

import { inspectUrl } from "../lib/security/url-inspector.ts";

test("ordinary HTTPS URLs are parsed without a false safety verdict", () => {
  const result = inspectUrl("https://example.com/docs?q=pdf");
  assert.equal(result.hostname, "example.com");
  assert.equal(result.protocol, "https:");
  assert.equal(result.riskLevel, "No obvious structural warnings");
  assert.deepEqual(result.query, [{ name: "q", value: "pdf" }]);
});

test("missing schemes are treated as HTTPS with an informational finding", () => {
  const result = inspectUrl("example.com/path");
  assert.equal(result.inferredScheme, true);
  assert.equal(result.normalizedUrl, "https://example.com/path");
  assert.ok(
    result.findings.some((finding) => finding.code === "inferred-scheme"),
  );
});

test("embedded credentials and non-web schemes trigger high caution", () => {
  const credentials = inspectUrl("https://trusted.example@evil.test/login");
  assert.equal(credentials.hostname, "evil.test");
  assert.equal(credentials.username, "trusted.example");
  assert.equal(credentials.riskLevel, "High caution");
  assert.ok(
    credentials.findings.some((finding) => finding.code === "credentials"),
  );
  assert.equal(inspectUrl("javascript:alert(1)").riskLevel, "High caution");
});

test("IP hosts, private networks, ports, and punycode are called out", () => {
  const local = inspectUrl("http://192.168.1.10:8080/admin");
  assert.deepEqual(
    local.findings.map((finding) => finding.code),
    ["http", "ip-host", "local-host", "port"],
  );
  assert.ok(
    inspectUrl("https://xn--pple-43d.example").findings.some(
      (finding) => finding.code === "punycode",
    ),
  );
});

test("nested and repeatedly encoded redirect URLs are detected", () => {
  const result = inspectUrl(
    "https://example.com/out?next=https%253A%252F%252Fevil.test%252Flogin",
  );
  assert.ok(result.findings.some((finding) => finding.code === "nested-url"));
});

test("mixed-script lookalike hostnames trigger high caution", () => {
  const result = inspectUrl("https://pаypal.example");
  assert.equal(result.riskLevel, "High caution");
  assert.ok(
    result.findings.some((finding) => finding.code === "mixed-scripts"),
  );
});

test("invalid and empty input is rejected", () => {
  assert.throws(() => inspectUrl(""), /Enter a URL/);
  assert.throws(() => inspectUrl("http://[broken"), /not a valid URL/);
});
