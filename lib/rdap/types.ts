/** What the user typed, once we've worked out what kind of thing it is. */
export type LookupKind = "domain" | "ip" | "autnum";

export type LookupTarget = {
  kind: LookupKind;
  /** Normalised query value — lowercased domain, bare IP, or numeric ASN. */
  value: string;
};

export type RdapEvent = {
  action: string;
  date: string;
};

export type RdapContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type RdapEntitySummary = {
  roles: string[];
  name: string | null;
  handle: string | null;
  /** IANA Registrar ID, present on registrar entities. */
  ianaId: string | null;
  contact: RdapContact | null;
};

export type RdapNameserver = {
  name: string;
  addresses: string[];
};

/** Flattened, render-ready view of an RDAP response. */
export type RdapRecord = {
  objectClass: string;
  handle: string | null;
  /** Domain name, IP range, or AS number depending on the lookup kind. */
  name: string | null;
  unicodeName: string | null;
  statuses: string[];
  events: RdapEvent[];
  nameservers: RdapNameserver[];
  entities: RdapEntitySummary[];
  registrar: RdapEntitySummary | null;
  abuseContact: RdapContact | null;
  dnssecSigned: boolean | null;
  /** IP/ASN lookups only. */
  network: {
    startAddress: string | null;
    endAddress: string | null;
    cidr: string | null;
    ipVersion: string | null;
    type: string | null;
    country: string | null;
  } | null;
  /** Which RDAP server answered, so results are attributable. */
  sources: string[];
  raw: unknown;
};

export type RdapLookupSuccess = {
  ok: true;
  data: RdapRecord;
};

export type RdapLookupFailure = {
  ok: false;
  /**
   * `no-service` — the registry publishes no RDAP endpoint for this TLD.
   * `not-found` — the registry answered, but the object is not registered.
   * `error` — network, CORS, or an unexpected status from the registry.
   */
  reason: "no-service" | "not-found" | "error";
  error: string;
  /** Present for `no-service`, so the UI can name the TLD. */
  tld?: string;
};

export type RdapLookupResult = RdapLookupSuccess | RdapLookupFailure;
