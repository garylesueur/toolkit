import assert from "node:assert/strict";
import test from "node:test";

import {
  measureCodeChange,
  transformWebCode,
} from "../lib/web-code/transform.ts";

test("formats nested HTML with readable indentation", async () => {
  const output = await transformWebCode(
    "<main><h1>Hello</h1><p>World</p></main>",
    { language: "html", action: "format", indent: 2 },
  );
  assert.equal(output, "<main>\n  <h1>Hello</h1>\n  <p>World</p>\n</main>\n");
});

test("HTML formatting supports four-space indentation", async () => {
  const output = await transformWebCode(
    "<main><section><p>Text</p></section></main>",
    {
      language: "html",
      action: "format",
      indent: 4,
    },
  );
  assert.match(output, /\n {4}<section>/);
});

test("minifies HTML, inline CSS, and inline JavaScript together", async () => {
  const output = await transformWebCode(
    `<!-- remove --><div class="card" style="color: red; padding: 0px 10px"><script>const total = 1 + 2; console.log(total);</script> Hello </div>`,
    { language: "html", action: "minify" },
  );
  assert.doesNotMatch(output, /remove/);
  assert.doesNotMatch(output, /\n/);
  assert.match(output, /style="color:red;padding:0 10px"/);
  assert.match(output, /<script>const total=3;console\.log\(3\)<\/script>/);
});

test("formats CSS declarations and nested at-rules", async () => {
  const output = await transformWebCode(
    "@media (min-width:600px){.card{display:grid;color:red}}",
    { language: "css", action: "format", indent: 2 },
  );
  assert.match(output, /@media \(min-width: 600px\) \{/);
  assert.match(output, /  \.card \{/);
  assert.match(output, /    display: grid;/);
});

test("minifies CSS with safe value reductions", async () => {
  const output = await transformWebCode(
    ".card { margin: 0px 0px 0px 0px; color: #ff0000; }",
    { language: "css", action: "minify" },
  );
  assert.equal(output, ".card{margin:0;color:red}");
});

test("formats modern JavaScript without executing it", async () => {
  const output = await transformWebCode(
    "const greet=(name)=>{return `Hello ${name}`};console.log(greet('Ada'))",
    { language: "javascript", action: "format", indent: 2 },
  );
  assert.match(output, /const greet = \(name\) => \{/);
  assert.match(output, /return `Hello \$\{name\}`;/);
  assert.match(output, /console\.log\(greet\("Ada"\)\);/);
});

test("minifies JavaScript while preserving public names", async () => {
  const output = await transformWebCode(
    "function add(first, second) { return first + second; } console.log(add(1, 2));",
    { language: "javascript", action: "minify" },
  );
  assert.equal(
    output,
    "function add(first,second){return first+second}console.log(add(1,2));",
  );
});

test("syntax errors are labelled with their language and action", async () => {
  await assert.rejects(
    transformWebCode("const = ;", {
      language: "javascript",
      action: "format",
    }),
    /Could not format javascript/,
  );
});

test("empty input remains empty and indentation is validated", async () => {
  assert.equal(
    await transformWebCode("   ", { language: "css", action: "minify" }),
    "",
  );
  await assert.rejects(
    transformWebCode("a {}", {
      language: "css",
      action: "format",
      indent: 3 as 2,
    }),
    /Indentation must be 2 or 4 spaces/,
  );
});

test("reports UTF-8 byte sizes and percentage change", () => {
  assert.deepEqual(measureCodeChange("é  ", "é"), {
    inputBytes: 4,
    outputBytes: 2,
    reduction: 50,
  });
  assert.deepEqual(measureCodeChange("", ""), {
    inputBytes: 0,
    outputBytes: 0,
    reduction: 0,
  });
});
