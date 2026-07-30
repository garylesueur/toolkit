/**
 * EPP status codes explained. RDAP reports these as space-separated lowercase
 * words ("client transfer prohibited") rather than the camelCase form used in
 * WHOIS, so lookups normalise on a squashed, lowercased key.
 */
type EppStatus = {
  /** The canonical camelCase name registrars and ICANN documentation use. */
  code: string;
  summary: string;
};

const EPP_STATUSES: EppStatus[] = [
  {
    code: "addPeriod",
    summary:
      "Grace period just after registration — the registrar may still cancel it for a refund.",
  },
  {
    code: "autoRenewPeriod",
    summary:
      "Grace period just after an automatic renewal — the renewal can still be reversed.",
  },
  {
    code: "inactive",
    summary:
      "No nameservers are delegated, so the domain will not resolve anywhere.",
  },
  {
    code: "ok",
    summary:
      "Standard status — no pending operations or restrictions. Often a sign the registrar locks are switched off.",
  },
  {
    code: "pendingCreate",
    summary: "A request to create the domain is being processed.",
  },
  {
    code: "pendingDelete",
    summary:
      "The domain is being deleted — either in the redemption grace period or awaiting release back to the pool.",
  },
  {
    code: "pendingRenew",
    summary: "A renewal request is being processed.",
  },
  {
    code: "pendingRestore",
    summary:
      "A restore has been requested after deletion and the registry is awaiting confirmation.",
  },
  {
    code: "pendingTransfer",
    summary: "A transfer to a different registrar is in progress.",
  },
  {
    code: "pendingUpdate",
    summary: "An update request is being processed.",
  },
  {
    code: "redemptionPeriod",
    summary:
      "Deleted, but still recoverable by the original registrant for a restore fee. Usually 30 days.",
  },
  {
    code: "renewPeriod",
    summary: "Grace period just after a manual renewal.",
  },
  {
    code: "serverDeleteProhibited",
    summary:
      "The registry blocks deletion. Usually applied during a dispute or legal action.",
  },
  {
    code: "serverHold",
    summary:
      "The registry has removed the domain from the zone — it will not resolve, regardless of nameservers.",
  },
  {
    code: "serverRenewProhibited",
    summary: "The registry blocks renewal. Rare, and usually a dispute.",
  },
  {
    code: "serverTransferProhibited",
    summary:
      "The registry blocks transfers to another registrar. Often applied during a dispute.",
  },
  {
    code: "serverUpdateProhibited",
    summary: "The registry blocks changes to the domain.",
  },
  {
    code: "transferPeriod",
    summary: "Grace period just after a registrar transfer.",
  },
  {
    code: "clientDeleteProhibited",
    summary:
      "The registrar blocks deletion. A normal protective lock you can toggle in your registrar account.",
  },
  {
    code: "clientHold",
    summary:
      "The registrar has asked the registry to remove the domain from the zone — it will not resolve. Often non-payment or a complaint.",
  },
  {
    code: "clientRenewProhibited",
    summary: "The registrar blocks renewal.",
  },
  {
    code: "clientTransferProhibited",
    summary:
      "The registrar blocks transfers out. This is the standard anti-hijacking lock and is a good thing to see.",
  },
  {
    code: "clientUpdateProhibited",
    summary:
      "The registrar blocks changes to the domain, including nameserver edits.",
  },
];

const BY_KEY = new Map(
  EPP_STATUSES.map((status) => [status.code.toLowerCase(), status]),
);

/** "client transfer prohibited" and "clientTransferProhibited" both map here. */
export function explainEppStatus(status: string): EppStatus {
  const key = status.replace(/[\s_-]/g, "").toLowerCase();
  const known = BY_KEY.get(key);
  if (known) return known;

  return {
    code: status,
    summary: "Registry-specific status — not a standard EPP code.",
  };
}

/** Statuses worth drawing attention to: the domain is not resolving or is on its way out. */
const ALARMING = new Set([
  "clienthold",
  "serverhold",
  "pendingdelete",
  "redemptionperiod",
  "inactive",
]);

export function isAlarmingStatus(status: string): boolean {
  return ALARMING.has(status.replace(/[\s_-]/g, "").toLowerCase());
}

export type { EppStatus };
