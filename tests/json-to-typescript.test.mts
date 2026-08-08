import assert from "node:assert/strict";
import test from "node:test";

import {
  generateTypescript,
  sanitizeTypeName,
} from "../lib/text/json-to-typescript.ts";

const OPTIONS = {
  exportTypes: true,
  readonlyFields: false,
  rootName: "Api response",
};

test("type names are converted to safe PascalCase identifiers", () => {
  assert.equal(sanitizeTypeName("api response"), "ApiResponse");
  assert.equal(sanitizeTypeName("123 result"), "Type123Result");
  assert.equal(sanitizeTypeName("---"), "Root");
});

test("flat JSON objects become exported interfaces", () => {
  assert.equal(
    generateTypescript(
      '{"id":1,"name":"Ada","active":true,"note":null}',
      OPTIONS,
    ),
    "export interface ApiResponse {\n  id: number;\n  name: string;\n  active: boolean;\n  note: null;\n}",
  );
});

test("nested objects produce named child interfaces", () => {
  const output = generateTypescript(
    '{"user":{"id":1,"profile":{"name":"Ada"}}}',
    OPTIONS,
  );
  assert.match(output, /interface ApiResponseUserProfile/);
  assert.match(output, /interface ApiResponseUser/);
  assert.match(output, /profile: ApiResponseUserProfile/);
  assert.match(output, /user: ApiResponseUser/);
});

test("arrays of objects merge fields and infer optional properties", () => {
  const output = generateTypescript(
    '{"users":[{"id":1,"name":"Ada"},{"id":2,"email":"a@example.test"}]}',
    OPTIONS,
  );
  assert.match(output, /name\?: string/);
  assert.match(output, /email\?: string/);
  assert.match(output, /users: ApiResponseUsersItem\[\]/);
});

test("heterogeneous and nullable arrays become unions", () => {
  const output = generateTypescript('{"values":[1,"two",null]}', OPTIONS);
  assert.match(output, /values: Array<null \| number \| string>/);
});

test("empty arrays safely use unknown instead of any", () => {
  assert.match(
    generateTypescript('{"items":[]}', OPTIONS),
    /items: unknown\[\]/,
  );
});

test("invalid property identifiers are safely quoted", () => {
  const output = generateTypescript(
    '{"first-name":"Ada","content type":"json"}',
    OPTIONS,
  );
  assert.match(output, /"first-name": string/);
  assert.match(output, /"content type": string/);
});

test("readonly and non-exported output options are respected", () => {
  const output = generateTypescript('{"id":1}', {
    exportTypes: false,
    readonlyFields: true,
    rootName: "item",
  });
  assert.equal(output, "interface Item {\n  readonly id: number;\n}");
});

test("root arrays and primitives become type aliases", () => {
  assert.equal(
    generateTypescript("[1,2,3]", { ...OPTIONS, rootName: "numbers" }),
    "export type Numbers = number[];",
  );
  assert.equal(
    generateTypescript('"hello"', { ...OPTIONS, rootName: "value" }),
    "export type Value = string;",
  );
});

test("invalid JSON produces a stable error", () => {
  assert.throws(() => generateTypescript("{", OPTIONS), /Invalid JSON/);
});
