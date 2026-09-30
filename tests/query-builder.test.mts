import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUrlQuery,
  moveQueryParameter,
  parseUrlQuery,
} from "../lib/url/query-builder.ts";

test("absolute URLs preserve duplicate parameters, empty values, and fragments", () => {
  assert.deepEqual(
    parseUrlQuery("https://example.test/search?q=one&q=two&empty=#results"),
    {
      base: "https://example.test/search",
      fragment: "results",
      parameters: [
        { hasEquals: true, name: "q", value: "one" },
        { hasEquals: true, name: "q", value: "two" },
        { hasEquals: true, name: "empty", value: "" },
      ],
      sourceType: "absolute-url",
    },
  );
});

test("query-only input supports bare flags and plus-encoded spaces", () => {
  assert.deepEqual(parseUrlQuery("debug&name=Ada+Lovelace"), {
    base: "",
    fragment: "",
    parameters: [
      { hasEquals: false, name: "debug", value: "" },
      { hasEquals: true, name: "name", value: "Ada Lovelace" },
    ],
    sourceType: "query-string",
  });
});

test("relative URLs and paths are identified without inventing an origin", () => {
  assert.deepEqual(parseUrlQuery("/docs/page?lang=en#intro"), {
    base: "/docs/page",
    fragment: "intro",
    parameters: [{ hasEquals: true, name: "lang", value: "en" }],
    sourceType: "relative-url",
  });
});

test("building encodes Unicode and spaces with browser query semantics", () => {
  assert.equal(
    buildUrlQuery(
      "https://example.test/search",
      [{ hasEquals: true, name: "query", value: "café au lait" }],
      "résumé/part 1",
    ),
    "https://example.test/search?query=caf%C3%A9+au+lait#r%C3%A9sum%C3%A9/part%201",
  );
});

test("building preserves bare flags separately from explicit empty values", () => {
  assert.equal(
    buildUrlQuery(
      "",
      [
        { hasEquals: false, name: "debug", value: "" },
        { hasEquals: true, name: "empty", value: "" },
      ],
      "",
    ),
    "?debug&empty=",
  );
});

test("a parsed URL round-trips deterministically", () => {
  const parsed = parseUrlQuery(
    "https://example.test/a?x=1&x=2&flag#section%202",
  );
  assert.equal(
    buildUrlQuery(parsed.base, parsed.parameters, parsed.fragment),
    "https://example.test/a?x=1&x=2&flag#section%202",
  );
});

test("empty and malformed input is rejected", () => {
  assert.throws(() => parseUrlQuery("  "), /Enter a URL/);
  assert.throws(
    () => parseUrlQuery("?value=%ZZ"),
    /malformed percent-encoding/,
  );
  assert.throws(
    () => parseUrlQuery("/path#%E0%A4%A"),
    /malformed percent-encoding/,
  );
});

test("parameter ordering can move up and down without mutation", () => {
  const source = [
    { hasEquals: true, name: "a", value: "1" },
    { hasEquals: true, name: "b", value: "2" },
    { hasEquals: true, name: "c", value: "3" },
  ];
  assert.deepEqual(
    moveQueryParameter(source, 2, 0).map((item) => item.name),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    source.map((item) => item.name),
    ["a", "b", "c"],
  );
  assert.deepEqual(moveQueryParameter(source, -1, 1), source);
});
