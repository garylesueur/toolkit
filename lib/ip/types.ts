export type IpVersion = "ipv4" | "ipv6" | "unknown";

/** Broad category of an address, derived from its numeric range. */
export type IpScope =
  | "public"
  | "loopback"
  | "private"
  | "cgnat"
  | "link-local"
  | "multicast"
  | "reserved"
  | "unknown";

/** Geo hints Vercel's edge attaches to the request. All are optional — several are plan-gated. */
export type IpGeo = {
  country: string | null;
  countryRegion: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  timezone: string | null;
  postalCode: string | null;
};

export type IpHeader = {
  name: string;
  value: string;
};

export type IpLookupData = {
  /** The address the server saw, or null if no forwarding header was present. */
  ip: string | null;
  /** Which header the address came from — surfaced so the answer is auditable. */
  source: string | null;
  version: IpVersion;
  scope: IpScope;
  geo: IpGeo;
  /** Inbound request headers, minus anything sensitive. */
  headers: IpHeader[];
};

export type IpLookupSuccess = {
  ok: true;
  data: IpLookupData;
};

export type IpLookupError = {
  ok: false;
  error: string;
};

export type IpLookupResult = IpLookupSuccess | IpLookupError;

/** Result of probing an IPv4-only or IPv6-only endpoint from the browser. */
export type StackProbe = {
  status: "pending" | "available" | "unavailable";
  ip: string | null;
};
