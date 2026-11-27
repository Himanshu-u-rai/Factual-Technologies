import { ImageResponse } from "next/og";

export const alt =
  "Factual Technologies — Production Software, Cloud & AI Engineering";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          padding: "64px 72px",
          border: "1px solid #e2e8f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="40" height="40" rx="8" fill="#0f172a" />
              <path
                d="M12 13H28M12 20H23M12 13V28"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#0f172a",
              }}
            >
              Factual Technologies
            </div>
          </div>

          <div
            style={{
              fontSize: 16,
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: "9999px",
              padding: "8px 18px",
            }}
          >
            factualtechnologies.tech
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "960px" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
              color: "#020617",
            }}
          >
            Production software, cloud &amp; AI systems built alongside your team.
          </div>
          <div
            style={{
              fontSize: 26,
              lineHeight: 1.4,
              color: "#475569",
            }}
          >
            Senior systems architects, full-stack engineers, and enterprise AI builders in San Francisco. No agency handoffs.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "28px",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", gap: "14px" }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#0f172a",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "10px 18px",
              }}
            >
              Digital Product Engineering
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#0f172a",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "10px 18px",
              }}
            >
              AI Systems &amp; Cited Search
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#0f172a",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "10px 18px",
              }}
            >
              Cloud &amp; Data Pipelines
            </div>
          </div>

          <div style={{ fontSize: 16, color: "#64748b" }}>
            SOC2 / HIPAA Ready
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
