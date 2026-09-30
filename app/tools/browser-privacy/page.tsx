"use client";

import {
  RiCheckLine,
  RiEyeLine,
  RiInformationLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { assessBrowserPrivacy } from "@/lib/security/browser-privacy";
import type {
  BrowserPrivacyInput,
  PermissionStateValue,
  PrivacyFinding,
} from "@/lib/security/browser-privacy";

type FingerprintSurface = {
  deviceMemory: string;
  hardwareConcurrency: string;
  languages: string;
  screen: string;
  timeZone: string;
  userAgent: string;
};

function storageAvailable(storage: Storage) {
  try {
    const key = `toolkit-privacy-check-${crypto.randomUUID()}`;
    storage.setItem(key, "1");
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

async function permissionState(
  name: PermissionName,
): Promise<PermissionStateValue> {
  if (!navigator.permissions) return "unsupported";
  try {
    return (await navigator.permissions.query({ name })).state;
  } catch {
    return "unsupported";
  }
}

export default function BrowserPrivacyPage() {
  const [working, setWorking] = useState(false);
  const [findings, setFindings] = useState<PrivacyFinding[]>([]);
  const [surface, setSurface] = useState<FingerprintSurface | null>(null);

  const runCheck = async () => {
    setWorking(true);
    const [camera, geolocation, microphone, notifications] = await Promise.all([
      permissionState("camera"),
      permissionState("geolocation"),
      permissionState("microphone"),
      permissionState("notifications"),
    ]);
    const navigatorWithPrivacy = navigator as Navigator & {
      deviceMemory?: number;
      globalPrivacyControl?: boolean;
    };
    const input: BrowserPrivacyInput = {
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      globalPrivacyControl:
        typeof navigatorWithPrivacy.globalPrivacyControl === "boolean"
          ? navigatorWithPrivacy.globalPrivacyControl
          : null,
      indexedDbAvailable: "indexedDB" in window,
      localStorageAvailable: storageAvailable(localStorage),
      permissions: { camera, geolocation, microphone, notifications },
      secureContext: window.isSecureContext,
      serviceWorkersAvailable: "serviceWorker" in navigator,
      sessionStorageAvailable: storageAvailable(sessionStorage),
      webRtcAvailable: "RTCPeerConnection" in window,
    };
    setFindings(assessBrowserPrivacy(input));
    setSurface({
      deviceMemory: navigatorWithPrivacy.deviceMemory
        ? `${navigatorWithPrivacy.deviceMemory} GB (coarsened)`
        : "Not exposed",
      hardwareConcurrency: navigator.hardwareConcurrency
        ? `${navigator.hardwareConcurrency} logical processors`
        : "Not exposed",
      languages: navigator.languages?.join(", ") || "Not exposed",
      screen: `${screen.width} × ${screen.height} at ${window.devicePixelRatio}× pixel ratio`,
      timeZone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Not exposed",
      userAgent: navigator.userAgent,
    });
    setWorking(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Browser Privacy Check
      </h1>
      <p className="mt-1 text-muted-foreground">
        Review privacy preferences, site permissions, storage, and exposed
        browser characteristics.
      </p>
      <PrivacyBanner>
        This check runs entirely in your browser and makes no external requests.
        It does not create or save a fingerprint.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        This cannot test your public IP, DNS, third-party cookie policy, or
        WebRTC leaks without an external observer. It reports only what this
        page can see locally and does not provide a single privacy score.
      </div>

      <Button className="mt-8" disabled={working} onClick={runCheck}>
        {working ? (
          <RiLoader4Line className="size-4 animate-spin" />
        ) : (
          <RiEyeLine className="size-4" />
        )}
        {working ? "Checking browser…" : "Run local privacy check"}
      </Button>

      {findings.length > 0 && surface && (
        <div className="mt-8 space-y-7">
          <section>
            <h2 className="text-lg font-semibold">
              Privacy signals and boundaries
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {findings.map((finding) => (
                <div
                  key={finding.label}
                  className={`rounded-lg border p-4 ${
                    finding.status === "caution"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : finding.status === "good"
                        ? "border-green-500/30 bg-green-500/5"
                        : "bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {finding.status === "good" ? (
                      <RiCheckLine className="size-4 text-green-600" />
                    ) : (
                      <RiInformationLine className="size-4 text-muted-foreground" />
                    )}
                    <h3 className="font-medium">{finding.label}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {finding.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Fingerprinting surface</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These ordinary characteristics can contribute to a fingerprint
              when combined across many signals. This tool displays them but
              does not combine, hash, or store them.
            </p>
            <dl className="mt-3 rounded-lg border px-4">
              {Object.entries({
                "Device memory": surface.deviceMemory,
                "Hardware concurrency": surface.hardwareConcurrency,
                "Languages": surface.languages,
                "Screen": surface.screen,
                "Time zone": surface.timeZone,
                "User agent": surface.userAgent,
              }).map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[12rem_1fr]"
                >
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="break-all text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
