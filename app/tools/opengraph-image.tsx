import { ImageResponse } from "next/og"

/**
 * Default Open Graph image for every route under `/tools/*`.
 * Keeps social previews consistent when individual tools are shared.
 */
export const alt = "Toolkit — Developer utilities"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 80,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Toolkit
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#a1a1aa",
            marginTop: 20,
            maxWidth: 900,
            lineHeight: 1.35,
          }}
        >
          Developer utilities — no sign-ups, no nonsense. toolkit.lesueur.uk
        </div>
      </div>
    ),
    { ...size },
  )
}
