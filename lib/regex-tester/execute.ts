import type { RegexMatch, RegexResult } from "./types";

/**
 * Runs a user-supplied pattern against the test string.
 *
 * Intended to run inside a Web Worker: a pattern like `^(a+)+$` backtracks
 * catastrophically and a single `exec` call can occupy its thread for minutes.
 * There is no way to interrupt that from inside, so the caller terminates the
 * worker instead — which is only survivable because it is not the UI thread.
 */
export function executeRegex(
  pattern: string,
  flags: string,
  testString: string,
): RegexResult {
  if (!pattern) {
    return { matches: [], error: null };
  }

  try {
    const flagsWithGlobal = flags.includes("g") ? flags : `g${flags}`;
    const regex = new RegExp(pattern, flagsWithGlobal);
    const matches: RegexMatch[] = [];

    let match: RegExpExecArray | null = regex.exec(testString);
    while (match !== null) {
      matches.push({
        index: match.index,
        text: match[0],
        groups: match.slice(1),
      });

      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
      match = regex.exec(testString);
    }

    return { matches, error: null };
  } catch (err) {
    const message =
      err instanceof SyntaxError ? err.message : "Invalid regular expression";
    return { matches: [], error: message };
  }
}
