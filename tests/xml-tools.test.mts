import assert from "node:assert/strict";
import test from "node:test";

import {
  formatXml,
  jsonToXml,
  minifyXml,
  validateXml,
  xmlToJson,
} from "../lib/text/xml-tools.ts";

const XML =
  '<catalog source="local"><item id="1">Alpha</item><item id="2">Beta</item></catalog>';

test("well-formed XML validates without a location error", () => {
  assert.deepEqual(validateXml(XML), {
    column: null,
    line: null,
    message: null,
    valid: true,
  });
});

test("malformed XML returns a useful line and column", () => {
  const result = validateXml("<root>\n<item></root>");
  assert.equal(result.valid, false);
  assert.equal(result.line, 2);
  assert.ok((result.column ?? 0) > 0);
  assert.match(result.message ?? "", /Expected closing tag/);
});

test("empty input has a stable validation message", () => {
  assert.equal(validateXml("  ").message, "Enter some XML first.");
});

test("DOCTYPE declarations are deliberately rejected", () => {
  const result = validateXml(
    '<!DOCTYPE root [<!ENTITY x "test">]><root>&x;</root>',
  );
  assert.equal(result.valid, false);
  assert.match(result.message ?? "", /DOCTYPE declarations are disabled/);
});

test("XML formatting preserves attributes, repeated elements, and text", () => {
  assert.equal(
    formatXml(XML),
    '<catalog source="local">\n  <item id="1">Alpha</item>\n  <item id="2">Beta</item>\n</catalog>',
  );
});

test("XML formatting supports custom indentation", () => {
  assert.match(
    formatXml("<root><child><leaf>1</leaf></child></root>", "    "),
    /\n {8}<leaf>/,
  );
});

test("XML minification removes layout whitespace but preserves content", () => {
  assert.equal(
    minifyXml("<root>\n  <item>Hello world</item>\n</root>"),
    "<root><item>Hello world</item></root>",
  );
});

test("XML converts to JSON using visible attribute and text keys", () => {
  assert.deepEqual(JSON.parse(xmlToJson(XML)), {
    catalog: {
      "@source": "local",
      "item": [
        { "#text": "Alpha", "@id": "1" },
        { "#text": "Beta", "@id": "2" },
      ],
    },
  });
});

test("JSON converts to formatted XML with arrays and attributes", () => {
  assert.equal(
    jsonToXml('{"root":{"@version":"1","item":["Alpha","Beta"]}}'),
    '<root version="1">\n  <item>Alpha</item>\n  <item>Beta</item>\n</root>',
  );
});

test("JSON to XML rejects malformed and multi-root input", () => {
  assert.throws(() => jsonToXml("{"), /Invalid JSON/);
  assert.throws(
    () => jsonToXml('{"one":{},"two":{}}'),
    /exactly one top-level/,
  );
  assert.throws(() => jsonToXml("[]"), /exactly one top-level/);
});

test("transforms reject malformed XML rather than guessing", () => {
  assert.throws(() => formatXml("<root>"), /Unclosed tag/);
  assert.throws(() => minifyXml("<root>"), /Unclosed tag/);
  assert.throws(() => xmlToJson("<root>"), /Unclosed tag/);
});
