"use client"

import { useState, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CopyableRow } from "@/components/copyable-row"

const COPY_RESET_MS = 2000

const CIDR_PATTERN = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/

const MAX_OCTET = 255
const BITS_PER_ADDRESS = 32

/** Prefix lengths at or above this value have no distinct broadcast/network separation. */
const POINT_TO_POINT_PREFIX = 31

interface CidrResult {
  networkAddress: string
  broadcastAddress: string
  subnetMask: string
  wildcardMask: string
  firstHost: string
  lastHost: string
  totalAddresses: number
  usableHosts: number
  cidrNotation: string
}

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & MAX_OCTET,
    (num >>> 16) & MAX_OCTET,
    (num >>> 8) & MAX_OCTET,
    num & MAX_OCTET,
  ].join(".")
}

function calculateCidr(cidr: string): CidrResult | null {
  const match = cidr.trim().match(CIDR_PATTERN)
  if (!match) return null

  const ip = match[1]
  const prefix = parseInt(match[2], 10)
  if (prefix < 0 || prefix > BITS_PER_ADDRESS) return null

  const octets = ip.split(".").map(Number)
  if (octets.some((o) => o < 0 || o > MAX_OCTET || !Number.isInteger(o))) {
    return null
  }

  const ipNum = ipToNumber(ip)
  const mask = prefix === 0 ? 0 : (~0 << (BITS_PER_ADDRESS - prefix)) >>> 0
  const wildcard = ~mask >>> 0
  const network = (ipNum & mask) >>> 0
  const broadcast = (network | wildcard) >>> 0
  const totalAddresses = Math.pow(2, BITS_PER_ADDRESS - prefix)
  const usableHosts =
    prefix >= POINT_TO_POINT_PREFIX ? totalAddresses : totalAddresses - 2

  return {
    networkAddress: numberToIp(network),
    broadcastAddress: numberToIp(broadcast),
    subnetMask: numberToIp(mask),
    wildcardMask: numberToIp(wildcard),
    firstHost:
      prefix >= POINT_TO_POINT_PREFIX
        ? numberToIp(network)
        : numberToIp(network + 1),
    lastHost:
      prefix >= POINT_TO_POINT_PREFIX
        ? numberToIp(broadcast)
        : numberToIp(broadcast - 1),
    totalAddresses,
    usableHosts,
    cidrNotation: `/${prefix}`,
  }
}

interface ResultRow {
  label: string
  value: string
}

function buildResultRows(result: CidrResult): ResultRow[] {
  return [
    { label: "Network address", value: result.networkAddress },
    { label: "Broadcast address", value: result.broadcastAddress },
    { label: "Subnet mask", value: result.subnetMask },
    { label: "Wildcard mask", value: result.wildcardMask },
    { label: "First usable host", value: result.firstHost },
    { label: "Last usable host", value: result.lastHost },
    { label: "Total addresses", value: result.totalAddresses.toLocaleString() },
    { label: "Usable hosts", value: result.usableHosts.toLocaleString() },
    { label: "CIDR notation", value: result.cidrNotation },
  ]
}

export default function CidrCalculatorPage() {
  const [input, setInput] = useState("")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const result = useMemo(() => calculateCidr(input), [input])

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedValue(text)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const hasInput = input.trim().length > 0
  const rows = result ? buildResultRows(result) : null

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        CIDR / Subnet Calculator
      </h1>
      <p className="text-muted-foreground mt-1">
        Enter a CIDR notation to see the network details, host range, and subnet
        mask.
      </p>

      <div className="mt-8 space-y-2">
        <Label htmlFor="cidr-input">CIDR notation</Label>
        <Input
          id="cidr-input"
          placeholder="e.g. 192.168.1.0/24"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono"
        />
      </div>

      {hasInput && !result && (
        <p className="mt-4 text-sm text-destructive">
          Enter a valid CIDR notation (e.g. 192.168.1.0/24).
        </p>
      )}

      {rows && (
        <div className="mt-6 space-y-2">
          {rows.map((row) => (
            <CopyableRow
              key={row.label}
              label={row.label}
              value={row.value}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
