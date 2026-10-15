import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formatCertificateDate, type CertificateDetails } from "./certificates";

export const BADGE_SIZE = 1080;

const asset = (...path: string[]) =>
  readFile(join(process.cwd(), "src/assets", ...path));

/** A square PNG to share: wordmark, name, course and date. */
export async function renderCertificateBadge(
  certificate: CertificateDetails,
  headers: Record<string, string> = {},
) {
  const [regular, extraBold, logo] = await Promise.all([
    asset("fonts/Inter-Regular.ttf"),
    asset("fonts/Inter-ExtraBold.ttf"),
    asset("brand/kc-logo-white.png"),
  ]);
  const logoHeight = 120;
  const logoWidth = Math.round((logoHeight * 1028) / 618);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 64,
        background: "#191919",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "6px solid #D9FF3D",
          borderRadius: 48,
          padding: 72,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={logoWidth}
          height={logoHeight}
          alt=""
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#D9FF3D",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: 4,
            }}
          >
            CERTIFIED VOLUNTEER
          </div>
          <div
            style={{
              display: "flex",
              color: "#FFFFFF",
              fontSize: 104,
              fontWeight: 800,
              lineHeight: 1.05,
              marginTop: 24,
            }}
          >
            {certificate.firstName}
          </div>
          <div
            style={{
              display: "flex",
              color: "#FFFFFF",
              fontSize: 44,
              marginTop: 32,
            }}
          >
            completed {certificate.courseTitle}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#9A9A9A",
            fontSize: 32,
          }}
        >
          <div style={{ display: "flex" }}>
            {formatCertificateDate(certificate.issuedAt)}
          </div>
          <div style={{ display: "flex" }}>{certificate.certificateNumber}</div>
        </div>
      </div>
    </div>,
    {
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: extraBold, weight: 800, style: "normal" },
      ],
      headers,
    },
  );
}
