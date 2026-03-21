import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #334155 0%, #1e293b 50%, #18181b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fbbf24"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          {/* Bar */}
          <line x1="8.5" y1="12" x2="15.5" y2="12" />
          {/* Left plate outer */}
          <line x1="5" y1="9" x2="5" y2="15" stroke-width="3" />
          {/* Left plate inner */}
          <line x1="7" y1="10" x2="7" y2="14" stroke-width="2.5" />
          {/* Right plate inner */}
          <line x1="17" y1="10" x2="17" y2="14" stroke-width="2.5" />
          {/* Right plate outer */}
          <line x1="19" y1="9" x2="19" y2="15" stroke-width="3" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
