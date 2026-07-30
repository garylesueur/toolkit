import type {
  RdapContact,
  RdapEntitySummary,
  RdapEvent,
  RdapNameserver,
  RdapRecord,
} from "./types";
import { vcardPhone, vcardValue } from "./vcard";

/**
 * RDAP responses are loosely typed by design — servers vary in which optional
 * members they populate. Everything here reads defensively and returns null
 * rather than throwing, so one odd registry can't blank the whole result.
 */
type RdapJson = Record<string, unknown>;

function asRecord(value: unknown): RdapJson | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RdapJson)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return asArray(value).filter(
    (item): item is string => typeof item === "string",
  );
}

function parseContact(entity: RdapJson): RdapContact | null {
  const vcard = entity.vcardArray;
  const name = vcardValue(vcard, "fn");
  const email = vcardValue(vcard, "email");
  const phone = vcardPhone(vcard);

  if (!name && !email && !phone) return null;
  return { name, email, phone };
}

function parseIanaId(entity: RdapJson): string | null {
  for (const entry of asArray(entity.publicIds)) {
    const id = asRecord(entry);
    if (!id) continue;
    if (asString(id.type)?.toLowerCase().includes("registrar")) {
      return asString(id.identifier);
    }
  }
  return null;
}

function parseEntity(value: unknown): RdapEntitySummary | null {
  const entity = asRecord(value);
  if (!entity) return null;

  const contact = parseContact(entity);
  return {
    roles: asStringArray(entity.roles),
    name: contact?.name ?? null,
    handle: asString(entity.handle),
    ianaId: parseIanaId(entity),
    contact,
  };
}

/** Abuse details hang off a nested entity of the registrar, not the top level. */
function findAbuseContact(entities: unknown[]): RdapContact | null {
  for (const value of entities) {
    const entity = asRecord(value);
    if (!entity) continue;

    if (asStringArray(entity.roles).includes("abuse")) {
      const contact = parseContact(entity);
      if (contact) return contact;
    }

    const nested = findAbuseContact(asArray(entity.entities));
    if (nested) return nested;
  }
  return null;
}

function parseEvents(value: unknown): RdapEvent[] {
  const events: RdapEvent[] = [];

  for (const entry of asArray(value)) {
    const event = asRecord(entry);
    if (!event) continue;

    const action = asString(event.eventAction);
    const date = asString(event.eventDate);
    if (action && date) events.push({ action, date });
  }

  return events;
}

function parseNameservers(value: unknown): RdapNameserver[] {
  const nameservers: RdapNameserver[] = [];

  for (const entry of asArray(value)) {
    const nameserver = asRecord(entry);
    if (!nameserver) continue;

    const name =
      asString(nameserver.ldhName) ?? asString(nameserver.unicodeName);
    if (!name) continue;

    const addresses: string[] = [];
    const ipAddresses = asRecord(nameserver.ipAddresses);
    if (ipAddresses) {
      addresses.push(...asStringArray(ipAddresses.v4));
      addresses.push(...asStringArray(ipAddresses.v6));
    }

    nameservers.push({ name: name.toLowerCase(), addresses });
  }

  return nameservers;
}

function parseDnssec(value: unknown): boolean | null {
  const secureDns = asRecord(value);
  if (!secureDns) return null;

  if (typeof secureDns.delegationSigned === "boolean") {
    return secureDns.delegationSigned;
  }
  // Some registries omit the flag but still list the DS records.
  if (asArray(secureDns.dsData).length > 0) return true;
  return null;
}

function parseNetwork(json: RdapJson): RdapRecord["network"] {
  const objectClass = asString(json.objectClassName);
  if (objectClass !== "ip network" && objectClass !== "autnum") return null;

  return {
    startAddress:
      asString(json.startAddress) ??
      (json.startAutnum === undefined ? null : String(json.startAutnum)),
    endAddress:
      asString(json.endAddress) ??
      (json.endAutnum === undefined ? null : String(json.endAutnum)),
    cidr: asString(json.cidr0_cidrs) ?? null,
    ipVersion: asString(json.ipVersion),
    type: asString(json.type),
    country: asString(json.country),
  };
}

export function parseRdapRecord(
  json: unknown,
  source: string,
): RdapRecord | null {
  const record = asRecord(json);
  if (!record) return null;

  const entities = asArray(record.entities);
  const parsedEntities = entities
    .map(parseEntity)
    .filter((entity): entity is RdapEntitySummary => entity !== null);

  const registrar =
    parsedEntities.find((entity) => entity.roles.includes("registrar")) ?? null;

  return {
    objectClass: asString(record.objectClassName) ?? "unknown",
    handle: asString(record.handle),
    name:
      asString(record.ldhName) ??
      asString(record.name) ??
      asString(record.handle),
    unicodeName: asString(record.unicodeName),
    statuses: asStringArray(record.status),
    events: parseEvents(record.events),
    nameservers: parseNameservers(record.nameservers),
    entities: parsedEntities,
    registrar,
    abuseContact: findAbuseContact(entities),
    dnssecSigned: parseDnssec(record.secureDNS),
    network: parseNetwork(record),
    sources: [source],
    raw: json,
  };
}

/**
 * Registry responses are deliberately thin; the registrar's own RDAP server
 * usually carries fuller contact and nameserver data. Registry values win on
 * conflict — it is the authoritative source — and the registrar fills gaps.
 */
export function mergeRdapRecords(
  registry: RdapRecord,
  registrar: RdapRecord,
): RdapRecord {
  return {
    ...registry,
    unicodeName: registry.unicodeName ?? registrar.unicodeName,
    statuses:
      registry.statuses.length > 0 ? registry.statuses : registrar.statuses,
    events: registry.events.length > 0 ? registry.events : registrar.events,
    nameservers:
      registry.nameservers.length > 0
        ? registry.nameservers
        : registrar.nameservers,
    entities:
      registrar.entities.length > registry.entities.length
        ? registrar.entities
        : registry.entities,
    registrar: registry.registrar ?? registrar.registrar,
    abuseContact: registry.abuseContact ?? registrar.abuseContact,
    dnssecSigned: registry.dnssecSigned ?? registrar.dnssecSigned,
    sources: [...registry.sources, ...registrar.sources],
  };
}

const EVENT_LABELS: Record<string, string> = {
  "registration": "Registered",
  "expiration": "Expires",
  "last changed": "Last changed",
  "last update of rdap database": "RDAP data updated",
  "transfer": "Transferred",
  "deletion": "Deleted",
  "reregistration": "Re-registered",
  "reinstantiation": "Reinstated",
  "locked": "Locked",
  "unlocked": "Unlocked",
};

export function describeEventAction(action: string): string {
  return EVENT_LABELS[action.toLowerCase()] ?? action;
}
