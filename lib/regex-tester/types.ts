export interface RegexMatch {
  index: number;
  text: string;
  groups: string[];
}

export interface RegexResult {
  matches: RegexMatch[];
  error: string | null;
  /** Set when matching was abandoned because it ran too long. */
  timedOut?: boolean;
}

export interface RegexRequest {
  id: number;
  pattern: string;
  flags: string;
  testString: string;
}

export interface RegexResponse extends RegexResult {
  id: number;
}
