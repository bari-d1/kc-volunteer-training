import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NarratorPlayground } from "./narrator-playground";

export const metadata: Metadata = {
  title: "Narrator preview",
  robots: { index: false },
};

/** Dev-only playground for the narrator. 404 in production. */
export default function NarratorPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <NarratorPlayground />;
}
