"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RiSearchLine } from "@remixicon/react";
import {
  httpStatusCodes,
  type HttpStatusCode,
  type HttpStatusCategory,
} from "@/lib/http-status/codes";

interface CategoryConfig {
  label: string;
  colorClass: string;
}

const CATEGORY_CONFIG: Record<HttpStatusCategory, CategoryConfig> = {
  informational: {
    label: "1xx — Informational",
    colorClass: "text-blue-600 dark:text-blue-400",
  },
  success: {
    label: "2xx — Success",
    colorClass: "text-green-600 dark:text-green-400",
  },
  redirection: {
    label: "3xx — Redirection",
    colorClass: "text-amber-600 dark:text-amber-400",
  },
  clientError: {
    label: "4xx — Client Error",
    colorClass: "text-red-600 dark:text-red-400",
  },
  serverError: {
    label: "5xx — Server Error",
    colorClass: "text-purple-600 dark:text-purple-400",
  },
};

const CATEGORY_ORDER: HttpStatusCategory[] = [
  "informational",
  "success",
  "redirection",
  "clientError",
  "serverError",
];

interface GroupedCodes {
  category: HttpStatusCategory;
  codes: HttpStatusCode[];
}

function groupByCategory(codes: HttpStatusCode[]): GroupedCodes[] {
  const groups = new Map<HttpStatusCategory, HttpStatusCode[]>();

  for (const code of codes) {
    const existing = groups.get(code.category);
    if (existing) {
      existing.push(code);
    } else {
      groups.set(code.category, [code]);
    }
  }

  const result: GroupedCodes[] = [];
  for (const category of CATEGORY_ORDER) {
    const codes = groups.get(category);
    if (codes && codes.length > 0) {
      result.push({ category, codes });
    }
  }

  return result;
}

function filterCodes(
  codes: HttpStatusCode[],
  query: string,
): HttpStatusCode[] {
  const normalised = query.trim().toLowerCase();
  if (normalised === "") return codes;

  return codes.filter(
    (code) =>
      code.code.toString().includes(normalised) ||
      code.name.toLowerCase().includes(normalised),
  );
}

interface StatusCodeCardProps {
  status: HttpStatusCode;
  colorClass: string;
}

function StatusCodeCard({ status, colorClass }: StatusCodeCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-md border bg-muted/30 px-4 py-3">
      <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>
        {status.code}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{status.name}</span>
          {status.cacheable && <Badge variant="secondary">Cacheable</Badge>}
          {status.retryable && <Badge variant="secondary">Retryable</Badge>}
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {status.description}
        </p>
      </div>
    </div>
  );
}

export default function HttpStatusCodesPage() {
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const filtered = filterCodes(httpStatusCodes, search);
    return groupByCategory(filtered);
  }, [search]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          HTTP Status Code Reference
        </h1>
        <p className="text-muted-foreground mt-1">
          A searchable reference of all HTTP status codes with descriptions and
          common use cases.
        </p>
      </div>

      <div className="relative">
        <RiSearchLine className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by code or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {grouped.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No status codes match your search.
        </p>
      )}

      {grouped.map((group) => {
        const config = CATEGORY_CONFIG[group.category];

        return (
          <section key={group.category} className="space-y-3">
            <h2 className={`text-lg font-semibold ${config.colorClass}`}>
              {config.label}
            </h2>
            <div className="space-y-2">
              {group.codes.map((code) => (
                <StatusCodeCard
                  key={code.code}
                  status={code}
                  colorClass={config.colorClass}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
