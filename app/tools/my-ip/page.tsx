"use client";

import {
  RiAlertLine,
  RiCheckLine,
  RiFileCopyLine,
  RiLoader4Line,
  RiRefreshLine,
} from "@remixicon/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CopyableRow } from "@/components/copyable-row";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import {
  describeScope,
  describeVersion,
  unwrapIpv4Mapped,
} from "@/lib/ip/format";
import { probeIpv4, probeIpv6 } from "@/lib/ip/probe";
import type { IpLookupData, IpLookupResult, StackProbe } from "@/lib/ip/types";

const COPY_RESET_MS = 2000;

const PENDING_PROBE: StackProbe = { status: "pending", ip: null };

function toProbe(ip: string | null): StackProbe {
  return ip ? { status: "available", ip } : { status: "unavailable", ip: null };
}

type GeoEntry = {
  label: string;
  value: string;
};

function geoEntries(data: IpLookupData): GeoEntry[] {
  const { geo } = data;
  const entries: GeoEntry[] = [];

  if (geo.city) entries.push({ label: "City", value: geo.city });
  if (geo.countryRegion)
    entries.push({ label: "Region", value: geo.countryRegion });
  if (geo.country) entries.push({ label: "Country", value: geo.country });
  if (geo.postalCode)
    entries.push({ label: "Postal code", value: geo.postalCode });
  if (geo.timezone) entries.push({ label: "Time zone", value: geo.timezone });
  if (geo.latitude && geo.longitude) {
    entries.push({
      label: "Coordinates",
      value: `${geo.latitude}, ${geo.longitude}`,
    });
  }

  return entries;
}

export default function MyIpPage() {
  const [result, setResult] = useState<IpLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [ipv4, setIpv4] = useState<StackProbe>(PENDING_PROBE);
  const [ipv6, setIpv6] = useState<StackProbe>(PENDING_PROBE);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [showHeaders, setShowHeaders] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setIpv4(PENDING_PROBE);
    setIpv6(PENDING_PROBE);

    fetch("/api/ip", { cache: "no-store" })
      .then((response) => response.json() as Promise<IpLookupResult>)
      .then((payload) => {
        if (!cancelled) setResult(payload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          ok: false,
          error:
            err instanceof Error ? err.message : "Could not reach the server.",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    probeIpv4().then((ip) => {
      if (!cancelled) setIpv4(toProbe(ip));
    });
    probeIpv6().then((ip) => {
      if (!cancelled) setIpv6(toProbe(ip));
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS);
  }, []);

  const data = result?.ok ? result.data : null;
  const mapped = data?.ip ? unwrapIpv4Mapped(data.ip) : null;
  const geo = data ? geoEntries(data) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        What Is My IP Address?
      </h1>
      <p className="text-muted-foreground mt-1">
        The public IP address this site&apos;s server sees, plus how your
        connection reaches it — IPv4, IPv6, or both.
      </p>
      <PrivacyBanner>
        Unlike most tools here, this one has to talk to a server — that is the
        only way to learn your public IP. The request is not logged or stored.
        Dual-stack detection additionally calls ipify.org.
      </PrivacyBanner>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 py-12">
          <RiLoader4Line className="text-muted-foreground size-5 animate-spin" />
          <span className="text-muted-foreground text-sm">Looking up…</span>
        </div>
      )}

      {!loading && result && !result.ok && (
        <div className="mt-8 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm font-medium text-destructive">{result.error}</p>
        </div>
      )}

      {!loading && data && (
        <div className="mt-8 space-y-8">
          <section className="rounded-lg border bg-muted/30 p-6">
            {data.ip ? (
              <>
                <p className="text-muted-foreground text-xs">
                  Your public IP address
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <p className="font-mono text-2xl font-semibold break-all sm:text-3xl">
                    {data.ip}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy IP address"
                    onClick={() => handleCopy(data.ip ?? "")}
                  >
                    {copiedValue === data.ip ? (
                      <RiCheckLine />
                    ) : (
                      <RiFileCopyLine />
                    )}
                  </Button>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {describeVersion(data.version)} · {describeScope(data.scope)}
                </p>
                {mapped && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    IPv4-mapped address —{" "}
                    <span className="font-mono">{mapped}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No forwarding header was present on this request. That is normal
                on a local dev server — deploy the site to see a real address.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Connectivity</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <StackCard label="IPv4" probe={ipv4} />
              <StackCard label="IPv6" probe={ipv6} />
            </div>
            {ipv4.status === "available" && ipv6.status === "unavailable" && (
              <p className="text-muted-foreground text-sm">
                IPv4 only — no IPv6 route was reachable from this browser.
              </p>
            )}
            {ipv4.status === "available" && ipv6.status === "available" && (
              <p className="text-muted-foreground text-sm">
                Dual-stack — your network can reach both IPv4 and IPv6 hosts.
              </p>
            )}
          </section>

          {geo.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Approximate location</h2>
              <p className="text-muted-foreground text-sm">
                Derived by the edge network from your IP. It points at your
                network&apos;s exit point, which is often nowhere near you.
              </p>
              <div className="space-y-2">
                {geo.map((entry) => (
                  <CopyableRow
                    key={entry.label}
                    label={entry.label}
                    value={entry.value}
                    copiedValue={copiedValue}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Request details</h2>
            <div className="space-y-2">
              {data.source && (
                <CopyableRow
                  label="Read from header"
                  value={data.source}
                  copiedValue={copiedValue}
                  onCopy={handleCopy}
                />
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHeaders((value) => !value)}
                >
                  {showHeaders ? "Hide" : "Show"} request headers (
                  {data.headers.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  <RiRefreshLine data-icon="inline-start" />
                  Refresh
                </Button>
              </div>
              {showHeaders && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 font-semibold">Header</th>
                        <th className="px-3 py-2 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.headers.map((header) => (
                        <tr key={header.name} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                            {header.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs break-all">
                            {header.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Cookies and authorization headers are stripped before the
                response is built.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Next steps</h2>
            <p className="text-muted-foreground text-sm">
              Want to know who owns this address?{" "}
              <Link
                href="/tools/domain-inspector"
                className="text-primary underline underline-offset-2"
              >
                Look it up in the Domain Inspector
              </Link>{" "}
              — it runs an RDAP query against the regional internet registry.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

function StackCard({ label, probe }: { label: string; probe: StackProbe }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      {probe.status === "pending" && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <RiLoader4Line className="size-3.5 animate-spin" />
          Checking…
        </p>
      )}
      {probe.status === "available" && (
        <p className="font-mono text-sm break-all">{probe.ip}</p>
      )}
      {probe.status === "unavailable" && (
        <p className="text-muted-foreground text-sm">Not available</p>
      )}
    </div>
  );
}
