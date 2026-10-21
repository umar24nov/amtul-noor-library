import { ImageResponse } from "next/og";
import { LIBRARY_NAME, LIBRARY_TAGLINE } from "@/lib/constants";

export const alt = `${LIBRARY_NAME} — ${LIBRARY_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px",
          backgroundColor: "#171717",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: "#fafafa",
              color: "#171717",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, color: "#a3a3a3" }}>
            {LIBRARY_NAME.toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Your Gateway to
          </div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Knowledge and Success
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 30, color: "#a3a3a3" }}>
            Reading room · Wi-Fi · AC · Roorkee, Uttarakhand
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#a3a3a3" }}>
          <div style={{ display: "flex" }}>amtulnoorlibrary.site</div>
          <div style={{ display: "flex" }}>+91 82733 06126</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
