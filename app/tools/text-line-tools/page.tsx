"use client";

import {
  RiCheckLine,
  RiFileCopyLine,
  RiFileDownloadLine,
  RiRefreshLine,
} from "@remixicon/react";
import { useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getLineStats, transformLines } from "@/lib/text/line-tools";
import type { LineOperation } from "@/lib/text/line-tools";

const EXAMPLE = `Item 10
apple
Item 2
banana
Apple

banana`;

const OPERATIONS: Array<{ label: string; value: LineOperation }> = [
  { label: "Sort", value: "sort" },
  { label: "Deduplicate", value: "deduplicate" },
  { label: "Shuffle", value: "shuffle" },
  { label: "Reverse", value: "reverse" },
  { label: "Number", value: "number" },
];

export default function TextLineToolsPage() {
  const [input, setInput] = useState(EXAMPLE);
  const [operation, setOperation] = useState<LineOperation>("sort");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [numericSort, setNumericSort] = useState(true);
  const [sortDirection, setSortDirection] = useState<
    "ascending" | "descending"
  >("ascending");
  const [trimLines, setTrimLines] = useState(false);
  const [removeBlankLines, setRemoveBlankLines] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [numberSeparator, setNumberSeparator] = useState(". ");
  const [padNumbers, setPadNumbers] = useState(false);
  const [shuffleNonce, setShuffleNonce] = useState(() => Math.random());
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const random = seededRandom(shuffleNonce);
    return transformLines(
      input,
      {
        caseSensitive,
        numberSeparator,
        numericSort,
        operation,
        padNumbers,
        removeBlankLines,
        sortDirection,
        startNumber,
        trimLines,
      },
      random,
    );
  }, [
    caseSensitive,
    input,
    numberSeparator,
    numericSort,
    operation,
    padNumbers,
    removeBlankLines,
    shuffleNonce,
    sortDirection,
    startNumber,
    trimLines,
  ]);
  const inputStats = getLineStats(input, caseSensitive);
  const outputStats = getLineStats(output, caseSensitive);

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "transformed-lines.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Text Line Tools</h1>
      <p className="mt-1 text-muted-foreground">
        Sort, deduplicate, shuffle, reverse, or number lines of text.
      </p>
      <PrivacyBanner>
        Your text is transformed entirely in this browser and is never uploaded.
      </PrivacyBanner>

      <section className="mt-8 flex flex-wrap gap-2">
        {OPERATIONS.map((item) => (
          <Button
            key={item.value}
            variant={operation === item.value ? "default" : "outline"}
            onClick={() => setOperation(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </section>

      <section className="mt-5 flex flex-wrap gap-x-6 gap-y-3 rounded-lg border p-4 text-sm">
        {operation === "sort" && (
          <>
            <label className="space-y-1 text-xs font-medium">
              Direction
              <select
                className="block h-9 rounded-md border bg-background px-3 text-sm"
                value={sortDirection}
                onChange={(event) =>
                  setSortDirection(
                    event.target.value as "ascending" | "descending",
                  )
                }
              >
                <option value="ascending">Ascending</option>
                <option value="descending">Descending</option>
              </select>
            </label>
            <Check
              label="Natural number order"
              checked={numericSort}
              onChange={setNumericSort}
            />
          </>
        )}
        {(operation === "sort" || operation === "deduplicate") && (
          <Check
            label="Case sensitive"
            checked={caseSensitive}
            onChange={setCaseSensitive}
          />
        )}
        {operation === "number" && (
          <>
            <label
              htmlFor="line-start-number"
              className="space-y-1 text-xs font-medium"
            >
              Start number
              <Input
                id="line-start-number"
                type="number"
                value={startNumber}
                onChange={(event) => setStartNumber(Number(event.target.value))}
                className="w-28"
              />
            </label>
            <label
              htmlFor="line-number-separator"
              className="space-y-1 text-xs font-medium"
            >
              Separator
              <Input
                id="line-number-separator"
                value={numberSeparator}
                onChange={(event) => setNumberSeparator(event.target.value)}
                className="w-28 font-mono"
              />
            </label>
            <Check
              label="Pad with zeroes"
              checked={padNumbers}
              onChange={setPadNumbers}
            />
          </>
        )}
        {operation === "shuffle" && (
          <Button
            variant="outline"
            onClick={() => setShuffleNonce(Math.random())}
          >
            <RiRefreshLine className="size-4" />
            Shuffle again
          </Button>
        )}
        <Check
          label="Trim each line"
          checked={trimLines}
          onChange={setTrimLines}
        />
        <Check
          label="Remove blank lines"
          checked={removeBlankLines}
          onChange={setRemoveBlankLines}
        />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="line-input" className="text-sm font-medium">
              Input lines
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setInput(EXAMPLE)}
              >
                Example
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput("")}>
                Clear
              </Button>
            </div>
          </div>
          <Textarea
            id="line-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-96 font-mono text-sm"
            spellCheck={false}
          />
          <Stats stats={inputStats} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Output lines</h2>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={!output}
                onClick={() => setInput(output)}
              >
                Use as input
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!output}
                onClick={copyOutput}
              >
                {copied ? (
                  <RiCheckLine className="size-4" />
                ) : (
                  <RiFileCopyLine className="size-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!output}
                onClick={download}
              >
                <RiFileDownloadLine className="size-4" />
                Download
              </Button>
            </div>
          </div>
          <pre className="min-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-mono text-sm">
            {output || "Transformed lines appear here."}
          </pre>
          <Stats stats={outputStats} />
        </div>
      </section>
    </div>
  );
}

type CheckProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

function Check({ checked, label, onChange }: CheckProps) {
  return (
    <label className="flex items-center gap-2 self-end pb-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

type StatsProps = {
  stats: ReturnType<typeof getLineStats>;
};

function Stats({ stats }: StatsProps) {
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {stats.lines} lines · {stats.unique} unique · {stats.blank} blank
    </p>
  );
}

function seededRandom(seed: number): () => number {
  let state = Math.floor(seed * 0xffffffff) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
