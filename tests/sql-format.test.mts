import assert from "node:assert/strict";
import test from "node:test";

import { formatSql, minifySql } from "../lib/text/sql-format.ts";

test("standard SQL is formatted with configurable keyword case", () => {
  assert.equal(
    formatSql("select id,name from users where active=1", {
      indent: "  ",
      keywordCase: "upper",
      language: "sql",
      linesBetweenQueries: 1,
    }),
    "SELECT id,\n  name\nFROM users\nWHERE active = 1",
  );
});

test("formatting supports lowercase keywords and four-space indentation", () => {
  const output = formatSql(
    "SELECT * FROM users WHERE id IN (SELECT id FROM admins)",
    {
      indent: "    ",
      keywordCase: "lower",
      language: "sql",
      linesBetweenQueries: 1,
    },
  );
  assert.match(output, /^select/);
  assert.match(output, /\n {8}select/);
});

test("empty SQL stays empty", () => {
  assert.equal(
    formatSql("  ", {
      indent: "\t",
      keywordCase: "preserve",
      language: "sql",
      linesBetweenQueries: "preserve",
    }),
    "",
  );
  assert.equal(minifySql("\n", { keepComments: true, language: "sql" }), "");
});

test("minification preserves quoted whitespace and removes layout whitespace", () => {
  assert.equal(
    minifySql(" SELECT  name FROM users\nWHERE note = 'two  spaces'; ", {
      keepComments: true,
      language: "sql",
    }),
    "SELECT name FROM users WHERE note = 'two  spaces';",
  );
});

test("minification keeps punctuation tight and operators readable", () => {
  assert.equal(
    minifySql("SELECT count(*), user.name FROM user WHERE id>=10;", {
      keepComments: true,
      language: "sql",
    }),
    "SELECT count(*), user.name FROM user WHERE id >= 10;",
  );
});

test("comments can be retained without merging neighbouring tokens", () => {
  assert.equal(
    minifySql("SELECT a -- reason\nFROM t /* source */ WHERE x = 1", {
      keepComments: true,
      language: "sql",
    }),
    "SELECT a -- reason FROM t /* source */ WHERE x = 1",
  );
});

test("comments can be removed without merging neighbouring tokens", () => {
  assert.equal(
    minifySql("SELECT a/* comment */FROM t -- reason\nWHERE x=1", {
      keepComments: false,
      language: "sql",
    }),
    "SELECT a FROM t WHERE x = 1",
  );
});

test("dialect selection accepts DB2, N1QL, and PL/SQL", () => {
  for (const language of ["db2", "n1ql", "pl/sql"] as const) {
    assert.match(
      formatSql("select * from example", {
        indent: "  ",
        keywordCase: "upper",
        language,
        linesBetweenQueries: 1,
      }),
      /^SELECT/,
    );
  }
});
