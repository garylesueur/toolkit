"use client";

import {
  RiAlertLine,
  RiCheckLine,
  RiFileCopyLine,
  RiInformationLine,
  RiLoader4Line,
  RiSearchLine,
} from "@remixicon/react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lookupDns } from "@/lib/dns/doh";
import type { DnsLookup } from "@/lib/dns/types";
import {
  daysUntil,
  describeRelativeDays,
  EXPIRY_WARNING_DAYS,
  formatRdapDate,
} from "@/lib/rdap/dates";
import { explainEppStatus, isAlarmingStatus } from "@/lib/rdap/epp-status";
import { describeEventAction } from "@/lib/rdap/parse";
import { lookupRdap } from "@/lib/rdap/query";
import { parseLookupInput } from "@/lib/rdap/target";
import type {
  LookupTarget,
  RdapLookupResult,
  RdapRecord,
} from "@/lib/rdap/types";

const COPY_RESET_MS = 2000;

const EXAMPLES = [
  "anthropic.com",
  "bbc.co.uk",
  "claude.ai",
  "8.8.8.8",
  "AS15169",
];

type LookupState = {
  target: LookupTarget;
  rdap: RdapLookupResult;
  dns: DnsLookup | null;
};

export default function DomainInspectorPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [state, setState] = useState<LookupState | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const runLookup = useCallback(async (raw: string) => {
    const target = parseLookupInput(raw);
    if (!target) {
      setInputError(
        "That does not look like a domain, IP address, or AS number. Try anthropic.com, 8.8.8.8, or AS15169.",
      );
      return;
    }

    setInputError(null);
    setLoading(true);
    setState(null);

    // DNS only makes sense for a name — IP and ASN lookups are RDAP alone.
    const [rdap, dns] = await Promise.all([
      lookupRdap(target),
      target.kind === "domain"
        ? lookupDns(target.value)
        : Promise.resolve(null),
    ]);

    setState({ target, rdap, dns });
    setLoading(false);
  }, []);

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS);
  }, []);

  const handleExample = useCallback(
    (example: string) => {
      setInput(example);
      void runLookup(example);
    },
    [runLookup],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Domain Inspector</h1>
      <p className="text-muted-foreground mt-1">
        Registration data over RDAP — the modern replacement for WHOIS —
        alongside live DNS records. Also works for IP addresses and AS numbers.
      </p>
      <div className="mt-3 flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
        <RiInformationLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Lookups run from your browser straight to IANA, the authoritative
          registry, and Cloudflare&apos;s DNS resolver. Nothing passes through
          this site&apos;s servers.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runLookup(input);
            }}
            placeholder="anthropic.com"
            className="min-w-0 flex-1 font-mono"
            aria-label="Domain, IP address, or AS number"
            spellCheck={false}
            autoCapitalize="none"
          />
          <Button
            onClick={() => void runLookup(input)}
            disabled={loading || input.trim().length === 0}
          >
            {loading ? (
              <RiLoader4Line
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <RiSearchLine data-icon="inline-start" />
            )}
            {loading ? "Looking up…" : "Look up"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Try:</span>
          {EXAMPLES.map((example) => (
            <Button
              key={example}
              variant="outline"
              size="xs"
              className="font-mono"
              onClick={() => handleExample(example)}
              disabled={loading}
            >
              {example}
            </Button>
          ))}
        </div>

        {inputError && <p className="text-sm text-destructive">{inputError}</p>}
      </div>

      {state && (
        <div className="mt-10 space-y-10">
          <RegistrationSection
            target={state.target}
            result={state.rdap}
            copiedValue={copiedValue}
            onCopy={handleCopy}
          />
          {state.dns && <DnsSection lookup={state.dns} />}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

function Notice({
  tone,
  children,
}: {
  tone: "warning" | "info";
  children: React.ReactNode;
}) {
  const isWarning = tone === "warning";
  return (
    <div
      className={
        isWarning
          ? "flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          : "flex items-start gap-2 rounded-lg border bg-muted/30 p-4"
      }
    >
      {isWarning ? (
        <RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" />
      ) : (
        <RiInformationLine className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      )}
      <div
        className={
          isWarning
            ? "text-sm text-destructive"
            : "text-muted-foreground text-sm"
        }
      >
        {children}
      </div>
    </div>
  );
}

function RegistrationSection({
  target,
  result,
  copiedValue,
  onCopy,
}: {
  target: LookupTarget;
  result: RdapLookupResult;
  copiedValue: string | null;
  onCopy: (value: string) => void;
}) {
  return (
    <section className="space-y-4">
      <SectionHeading>Registration</SectionHeading>

      {!result.ok && result.reason === "no-service" && (
        <Notice tone="info">
          <p>{result.error}</p>
          {target.kind === "domain" && (
            <p className="mt-1">
              DNS records below still work — only the registration data is
              unavailable.
            </p>
          )}
        </Notice>
      )}

      {!result.ok && result.reason === "not-found" && (
        <Notice tone="info">{result.error}</Notice>
      )}

      {!result.ok && result.reason === "error" && (
        <Notice tone="warning">{result.error}</Notice>
      )}

      {result.ok && (
        <RdapDetails
          record={result.data}
          copiedValue={copiedValue}
          onCopy={onCopy}
        />
      )}
    </section>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-t py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function RdapDetails({
  record,
  copiedValue,
  onCopy,
}: {
  record: RdapRecord;
  copiedValue: string | null;
  onCopy: (value: string) => void;
}) {
  const expiry = record.events.find(
    (event) => event.action.toLowerCase() === "expiration",
  );
  const expiryDays = expiry ? daysUntil(expiry.date) : null;
  const expiringSoon = expiryDays !== null && expiryDays <= EXPIRY_WARNING_DAYS;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">
            {record.objectClass === "domain"
              ? "Domain"
              : record.objectClass === "ip network"
                ? "IP network"
                : record.objectClass === "autnum"
                  ? "Autonomous system"
                  : "Object"}
          </p>
          <p className="truncate font-mono text-lg font-semibold">
            {record.name ?? "—"}
          </p>
          {record.unicodeName && record.unicodeName !== record.name && (
            <p className="text-muted-foreground font-mono text-sm">
              {record.unicodeName}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy name"
          onClick={() => onCopy(record.name ?? "")}
          disabled={!record.name}
        >
          {copiedValue === record.name ? <RiCheckLine /> : <RiFileCopyLine />}
        </Button>
      </div>

      {expiringSoon && expiry && (
        <Notice tone="warning">
          Expires {describeRelativeDays(expiryDays ?? 0)} —{" "}
          {formatRdapDate(expiry.date)}.
        </Notice>
      )}

      <dl className="border-b">
        {record.registrar && (
          <DetailRow label="Registrar">
            {record.registrar.name ?? record.registrar.handle ?? "—"}
            {record.registrar.ianaId && (
              <span className="text-muted-foreground">
                {" "}
                (IANA ID {record.registrar.ianaId})
              </span>
            )}
          </DetailRow>
        )}

        {record.handle && (
          <DetailRow label="Registry handle">
            <span className="font-mono text-xs">{record.handle}</span>
          </DetailRow>
        )}

        {record.events.map((event) => {
          const days = daysUntil(event.date);
          return (
            <DetailRow
              key={`${event.action}-${event.date}`}
              label={describeEventAction(event.action)}
            >
              {formatRdapDate(event.date)}
              {days !== null && (
                <span className="text-muted-foreground">
                  {" "}
                  · {describeRelativeDays(days)}
                </span>
              )}
            </DetailRow>
          );
        })}

        {record.dnssecSigned !== null && (
          <DetailRow label="DNSSEC">
            {record.dnssecSigned
              ? "Signed — the delegation carries DS records"
              : "Unsigned"}
          </DetailRow>
        )}

        {record.network && (
          <>
            {record.network.startAddress && record.network.endAddress && (
              <DetailRow label="Range">
                <span className="font-mono">
                  {record.network.startAddress} – {record.network.endAddress}
                </span>
              </DetailRow>
            )}
            {record.network.type && (
              <DetailRow label="Allocation type">
                {record.network.type}
              </DetailRow>
            )}
            {record.network.country && (
              <DetailRow label="Country">{record.network.country}</DetailRow>
            )}
          </>
        )}

        {record.abuseContact && (
          <DetailRow label="Abuse contact">
            {record.abuseContact.email ?? record.abuseContact.name ?? "—"}
            {record.abuseContact.phone && (
              <span className="text-muted-foreground">
                {" "}
                · {record.abuseContact.phone}
              </span>
            )}
          </DetailRow>
        )}
      </dl>

      {record.statuses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Status codes</h3>
          <div className="space-y-2">
            {record.statuses.map((status) => {
              const explained = explainEppStatus(status);
              const alarming = isAlarmingStatus(status);
              return (
                <div
                  key={status}
                  className={
                    alarming
                      ? "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
                      : "rounded-md border bg-muted/30 px-3 py-2"
                  }
                >
                  <p
                    className={
                      alarming
                        ? "font-mono text-sm text-destructive"
                        : "font-mono text-sm"
                    }
                  >
                    {explained.code}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    {explained.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {record.nameservers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Nameservers</h3>
          <ul className="space-y-1">
            {record.nameservers.map((nameserver) => (
              <li
                key={nameserver.name}
                className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm break-all"
              >
                {nameserver.name}
                {nameserver.addresses.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {nameserver.addresses.join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-muted-foreground text-xs break-all">
        Source: {record.sources.join(", ")}
      </p>
    </div>
  );
}

function DnsSection({ lookup }: { lookup: DnsLookup }) {
  const populated = lookup.answers.filter(
    (answer) => answer.records.length > 0,
  );
  const failed = lookup.answers.filter((answer) => answer.error !== null);

  return (
    <section className="space-y-4">
      <SectionHeading>DNS records</SectionHeading>

      {lookup.nxdomain && (
        <Notice tone="info">
          The resolver returned NXDOMAIN for every record type — this name does
          not exist in the DNS.
        </Notice>
      )}

      {!lookup.nxdomain && populated.length === 0 && failed.length === 0 && (
        <Notice tone="info">
          The name resolves, but none of the queried record types returned data.
        </Notice>
      )}

      {populated.map((answer) => (
        <div key={answer.type} className="space-y-2">
          <h3 className="font-mono text-sm font-semibold">{answer.type}</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Value</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">
                    TTL
                  </th>
                </tr>
              </thead>
              <tbody>
                {answer.records.map((record, index) => (
                  <tr
                    key={`${record.name}-${record.value}-${index}`}
                    className="border-t"
                  >
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {record.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs break-all">
                      {record.value}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {record.ttl}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {failed.map((answer) => (
        <p key={answer.type} className="text-sm text-destructive">
          <span className="font-mono">{answer.type}</span> — {answer.error}
        </p>
      ))}
    </section>
  );
}
