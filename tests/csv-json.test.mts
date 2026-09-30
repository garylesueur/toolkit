import assert from "node:assert/strict";
import test from "node:test";

import { jsonToCsv } from "../lib/csv-json/convert.ts";

test("object export retains later keys in first-seen order and empty missing cells", () => {
  assert.deepEqual(
    jsonToCsv({
      json: '[{"a":1},{"a":2,"b":3},{"c":false,"a":0,"b":null}]',
      delimiter: ",",
    }),
    { output: "a,b,c\r\n1,,\r\n2,3,\r\n0,,false", error: null },
  );
});

test("union columns retain quoting with every supported delimiter", () => {
  for (const delimiter of [",", ";", "\t"] as const) {
    const result = jsonToCsv({
      json: JSON.stringify([{ a: `x${delimiter}y` }, { b: 'say "hi"' }]),
      delimiter,
    });
    assert.equal(result.error, null);
    assert.equal(
      result.output,
      `a${delimiter}b\r\n"x${delimiter}y"${delimiter}\r\n${delimiter}"say ""hi"""`,
    );
  }
});

test("array-of-rows export remains headerless", () => {
  assert.equal(
    jsonToCsv({ json: '[[0,false,null],["x","y","z"]]', delimiter: ";" })
      .output,
    "0;false;\r\nx;y;z",
  );
});

test("missing prototype-named keys remain empty cells", () => {
  const result = jsonToCsv({
    json: '[{}, {"constructor":3,"toString":4,"__proto__":5}]',
    delimiter: ",",
  });
  assert.equal(result.output, "constructor,toString,__proto__\r\n,,\r\n3,4,5");
});
