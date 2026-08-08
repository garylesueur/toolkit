export type PermissionStateValue =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

export type BrowserPrivacyInput = {
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  globalPrivacyControl: boolean | null;
  indexedDbAvailable: boolean;
  localStorageAvailable: boolean;
  permissions: Record<
    "camera" | "geolocation" | "microphone" | "notifications",
    PermissionStateValue
  >;
  secureContext: boolean;
  serviceWorkersAvailable: boolean;
  sessionStorageAvailable: boolean;
  webRtcAvailable: boolean;
};

export type PrivacyFinding = {
  detail: string;
  label: string;
  status: "good" | "caution" | "info";
};

export function assessBrowserPrivacy(
  input: BrowserPrivacyInput,
): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];
  findings.push({
    detail: input.secureContext
      ? "This page has a secure context, so browser security boundaries are available."
      : "This page is not in a secure context; some browser protections and APIs may be unavailable.",
    label: "Secure context",
    status: input.secureContext ? "good" : "caution",
  });
  findings.push({
    detail:
      input.globalPrivacyControl === true
        ? "Global Privacy Control is enabled. Sites can see this preference, although compliance varies."
        : input.globalPrivacyControl === false
          ? "Global Privacy Control is available but not enabled."
          : "This browser does not expose a Global Privacy Control signal to pages.",
    label: "Global Privacy Control",
    status: input.globalPrivacyControl ? "good" : "info",
  });
  findings.push({
    detail:
      input.doNotTrack === "1"
        ? "Do Not Track is enabled, but sites are not required to honour it."
        : "Do Not Track is not enabled or not exposed. This is a preference signal, not a blocking control.",
    label: "Do Not Track",
    status: input.doNotTrack === "1" ? "good" : "info",
  });
  findings.push({
    detail: input.cookiesEnabled
      ? "Cookies are enabled. This supports sign-in and preferences but can also support tracking. Third-party cookie policy cannot be determined reliably here."
      : "The browser reports cookies disabled, which may reduce tracking but can break sign-in and site preferences.",
    label: "Cookies",
    status: "info",
  });
  const storage = [
    input.localStorageAvailable && "localStorage",
    input.sessionStorageAvailable && "sessionStorage",
    input.indexedDbAvailable && "IndexedDB",
  ].filter(Boolean);
  findings.push({
    detail: storage.length
      ? `Sites can access ${storage.join(", ")} for local persistence in this context.`
      : "Common browser storage APIs are unavailable in this context.",
    label: "Site storage",
    status: "info",
  });
  findings.push({
    detail: input.webRtcAvailable
      ? "WebRTC is available. This alone does not show an IP leak; a meaningful leak test requires an external observer."
      : "WebRTC is unavailable in this context.",
    label: "WebRTC",
    status: "info",
  });
  findings.push({
    detail: input.serviceWorkersAvailable
      ? "Service workers are available and can support offline caching and background web-app behaviour."
      : "Service workers are unavailable in this context.",
    label: "Service workers",
    status: "info",
  });
  for (const [name, state] of Object.entries(input.permissions)) {
    findings.push({
      detail:
        state === "granted"
          ? `${name} access is already granted to this site.`
          : state === "denied"
            ? `${name} access is blocked for this site.`
            : state === "prompt"
              ? `${name} access would require a browser prompt.`
              : `${name} permission state is not exposed by this browser.`,
      label: `${name[0].toUpperCase()}${name.slice(1)} permission`,
      status:
        state === "granted" ? "caution" : state === "denied" ? "good" : "info",
    });
  }
  return findings;
}
