import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "KC Volunteers' Onboarding";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The real white wordmark (1028×618), shown at 110px tall.
const logo = `data:image/png;base64,${(
  await readFile(join(process.cwd(), "src/assets/brand/kc-logo-white.png"))
).toString("base64")}`;
const LOGO_HEIGHT = 110;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 1028) / 618);

const interExtraBold = await readFile(
  join(process.cwd(), "src/assets/fonts/Inter-ExtraBold.woff"),
);

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#141414",
        color: "#FFFFFF",
        fontFamily: "Inter",
        fontWeight: 800,
      }}
    >
      <img src={logo} alt="" width={LOGO_WIDTH} height={LOGO_HEIGHT} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 132,
          lineHeight: 1.0,
          letterSpacing: "-0.01em",
        }}
      >
        <span>VOLUNTEERS&apos;</span>
        <span style={{ color: "#D9FF3D" }}>ONBOARDING</span>
      </div>
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          border: "3px solid #D9FF3D",
          borderRadius: 9999,
          padding: "12px 24px",
          color: "#D9FF3D",
          fontSize: 22,
          letterSpacing: "0.12em",
        }}
      >
        WELCOME TO THE FAMILY
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter", data: interExtraBold, style: "normal", weight: 800 },
      ],
    },
  );
}
