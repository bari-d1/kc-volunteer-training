"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import type { BlockProps } from "../block-props";

export function LinkQrBlock({
  label,
  url,
  description,
}: BlockProps<"LINK_QR">) {
  // A link from Settings is filled in before render; without one, show nothing.
  if (!url) return null;
  return (
    <div className="flex flex-col items-start gap-6 rounded-lg bg-surface p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div className="flex min-w-0 flex-col gap-4">
        <Button
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          // Long labels wrap instead of overflowing on small screens.
          className="h-auto! min-h-14 py-3 text-left whitespace-normal!"
        >
          {label} <span className="sr-only">(opens in a new tab)</span>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3h7v7M13 3L4 12" />
          </svg>
        </Button>
        {description && (
          <p className="max-w-sm text-body text-muted">{description}</p>
        )}
      </div>
      {/* On desktop, scan with a phone instead of clicking. */}
      <figure className="hidden shrink-0 flex-col items-center gap-2 md:flex">
        <div className="rounded-md bg-text p-3">
          <QRCodeSVG
            value={url}
            size={128}
            level="M"
            fgColor="#191919"
            bgColor="#FFFFFF"
            role="img"
            aria-label={`QR code for ${label}`}
          />
        </div>
        <figcaption className="text-label text-muted">
          Scan with your phone
        </figcaption>
      </figure>
    </div>
  );
}
