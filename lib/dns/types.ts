export const DNS_RECORD_TYPES = [
  "A",
  "AAAA",
  "MX",
  "NS",
  "TXT",
  "CAA",
  "SOA",
] as const;

export type DnsRecordType = (typeof DNS_RECORD_TYPES)[number];

export type DnsRecord = {
  name: string;
  ttl: number;
  value: string;
};

export type DnsAnswer = {
  type: DnsRecordType;
  records: DnsRecord[];
  /** Set when the query itself failed, rather than simply returning nothing. */
  error: string | null;
  /** True when the resolver reported NXDOMAIN for this name. */
  nxdomain: boolean;
};

export type DnsLookup = {
  answers: DnsAnswer[];
  /** True when every record type came back NXDOMAIN — the name does not exist. */
  nxdomain: boolean;
};
