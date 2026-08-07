import type { Tool } from "./tools";

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchableText(tool: Tool): string {
  return normalise(
    [tool.name, tool.description, ...tool.tags, ...(tool.keywords ?? [])].join(
      " ",
    ),
  );
}

export function toolSearchScore(tool: Tool, query: string): number | null {
  const normalisedQuery = normalise(query);
  if (!normalisedQuery) return 0;

  const name = normalise(tool.name);
  const keywords = normalise((tool.keywords ?? []).join(" "));
  const haystack = searchableText(tool);
  const tokens = normalisedQuery.split(" ").filter(Boolean);
  if (!tokens.every((token) => haystack.includes(token))) return null;

  if (name === normalisedQuery) return 1000;
  if (name.startsWith(normalisedQuery)) return 800;
  if (name.includes(normalisedQuery)) return 650;
  if (keywords.includes(normalisedQuery)) return 550;
  return 300 + tokens.filter((token) => name.includes(token)).length * 25;
}

export function searchTools(tools: Tool[], query: string): Tool[] {
  return tools
    .map((tool, index) => ({
      tool,
      index,
      score: toolSearchScore(tool, query),
    }))
    .filter((result) => result.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.index - b.index)
    .map((result) => result.tool);
}
