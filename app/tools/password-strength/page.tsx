"use client";

import { RiCheckLine, RiCloseLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analysePassword } from "@/lib/security/password-strength";

const COLOURS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-green-500",
];

export default function PasswordStrengthPage() {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const analysis = useMemo(() => analysePassword(password), [password]);
  const checks = [
    { label: "At least 14 characters", passed: password.length >= 14 },
    {
      label: "Uppercase and lowercase letters",
      passed: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { label: "At least one number", passed: /\d/.test(password) },
    { label: "At least one symbol", passed: /[^A-Za-z0-9]/.test(password) },
    {
      label: "No detected common patterns",
      passed: !!password && analysis.warnings.length === 0,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Password Strength Checker
      </h1>
      <p className="mt-1 text-muted-foreground">
        Check password length, character variety, and predictable patterns.
      </p>
      <PrivacyBanner>
        Your password is analysed only in this browser tab. It is never
        uploaded, logged, or saved by this tool.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border p-4 text-sm text-muted-foreground">
        This is a practical estimate, not a guarantee. Real resistance depends
        on how passwords are stored, attacker knowledge, reuse, and whether
        multi-factor authentication is enabled.
      </div>

      <div className="mt-8">
        <Label htmlFor="password-to-check">Password to check</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="password-to-check"
            type={visible ? "text" : "password"}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter a password…"
            className="font-mono"
          />
          <Button
            variant="outline"
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? "Hide" : "Show"}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Estimated strength
              </p>
              <p className="text-2xl font-semibold">{analysis.label}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              ~{analysis.estimatedEntropy} bits estimated entropy
            </p>
          </div>
          <div
            className="mt-3 grid grid-cols-5 gap-1.5"
            aria-label={`Strength: ${analysis.label}`}
          >
            {COLOURS.map((colour, index) => (
              <div
                key={colour}
                className={`h-2 rounded-full transition-colors ${password && index <= analysis.score ? colour : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Entropy is a rough upper-bound estimate with penalties for detected
            patterns; it is not a crack-time prediction.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h2 className="font-medium">Checks</h2>
            <div className="mt-3 space-y-2">
              {checks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center gap-2 text-sm"
                >
                  {check.passed ? (
                    <RiCheckLine className="size-4 text-green-600" />
                  ) : (
                    <RiCloseLine className="size-4 text-muted-foreground" />
                  )}
                  {check.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="font-medium">Pattern analysis</h2>
            {!password ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Enter a password to see specific warnings.
              </p>
            ) : analysis.warnings.length === 0 ? (
              <p className="mt-3 text-sm text-green-700 dark:text-green-300">
                No common words, dates, repeats, or sequences were detected.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {analysis.warnings.map((warning) => (
                  <li key={warning} className="flex gap-2">
                    <span className="text-destructive">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {password && analysis.suggestions.length > 0 && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <h2 className="font-medium">How to improve it</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {analysis.suggestions.map((suggestion) => (
                <li key={suggestion}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
