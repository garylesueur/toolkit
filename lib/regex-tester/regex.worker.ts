import { executeRegex } from "./execute";
import type { RegexRequest, RegexResponse } from "./types";

self.addEventListener("message", (event: MessageEvent<RegexRequest>) => {
  const { id, pattern, flags, testString } = event.data;
  const result = executeRegex(pattern, flags, testString);

  const response: RegexResponse = { id, ...result };
  self.postMessage(response);
});
