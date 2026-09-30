import assert from "node:assert/strict";
import test from "node:test";

import { assessBrowserPrivacy } from "../lib/security/browser-privacy.ts";
import type { BrowserPrivacyInput } from "../lib/security/browser-privacy.ts";

function input(
  overrides: Partial<BrowserPrivacyInput> = {},
): BrowserPrivacyInput {
  return {
    cookiesEnabled: true,
    doNotTrack: null,
    globalPrivacyControl: null,
    indexedDbAvailable: true,
    localStorageAvailable: true,
    permissions: {
      camera: "prompt",
      geolocation: "prompt",
      microphone: "prompt",
      notifications: "prompt",
    },
    secureContext: true,
    serviceWorkersAvailable: true,
    sessionStorageAvailable: true,
    webRtcAvailable: true,
    ...overrides,
  };
}

test("secure contexts and privacy preference signals are explained", () => {
  const findings = assessBrowserPrivacy(
    input({ doNotTrack: "1", globalPrivacyControl: true }),
  );
  assert.equal(
    findings.find((item) => item.label === "Secure context")?.status,
    "good",
  );
  assert.equal(
    findings.find((item) => item.label === "Global Privacy Control")?.status,
    "good",
  );
  assert.equal(
    findings.find((item) => item.label === "Do Not Track")?.status,
    "good",
  );
});

test("insecure contexts are flagged without turning informational APIs into failures", () => {
  const findings = assessBrowserPrivacy(input({ secureContext: false }));
  assert.equal(
    findings.find((item) => item.label === "Secure context")?.status,
    "caution",
  );
  assert.equal(
    findings.find((item) => item.label === "Cookies")?.status,
    "info",
  );
  assert.equal(
    findings.find((item) => item.label === "WebRTC")?.status,
    "info",
  );
});

test("granted permissions are cautions and denied permissions are positive boundaries", () => {
  const findings = assessBrowserPrivacy(
    input({
      permissions: {
        camera: "granted",
        geolocation: "denied",
        microphone: "prompt",
        notifications: "unsupported",
      },
    }),
  );
  assert.equal(
    findings.find((item) => item.label === "Camera permission")?.status,
    "caution",
  );
  assert.equal(
    findings.find((item) => item.label === "Geolocation permission")?.status,
    "good",
  );
  assert.match(
    findings.find((item) => item.label === "Notifications permission")
      ?.detail ?? "",
    /not exposed/,
  );
});

test("storage reporting lists only available mechanisms", () => {
  const finding = assessBrowserPrivacy(
    input({ indexedDbAvailable: false, sessionStorageAvailable: false }),
  ).find((item) => item.label === "Site storage");
  assert.match(finding?.detail ?? "", /localStorage/);
  assert.doesNotMatch(finding?.detail ?? "", /IndexedDB/);
});

test("WebRTC wording does not claim an external leak test", () => {
  const finding = assessBrowserPrivacy(input()).find(
    (item) => item.label === "WebRTC",
  );
  assert.match(finding?.detail ?? "", /does not show an IP leak/);
  assert.match(finding?.detail ?? "", /external observer/);
});
