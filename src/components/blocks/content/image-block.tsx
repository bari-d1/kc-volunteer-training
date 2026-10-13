import Image from "next/image";
import { isOptimizableImage } from "@/lib/media";
import type { BlockProps } from "../block-props";

export function ImageBlock({ url, alt, caption }: BlockProps<"IMAGE">) {
  return (
    <figure className="flex flex-col gap-3">
      <Image
        src={url}
        alt={alt}
        width={1600}
        height={1067}
        sizes="(min-width: 808px) 760px, 100vw"
        // Hosts outside next.config's allow list are shown as-is.
        unoptimized={!isOptimizableImage(url)}
        // Monochrome, like the deck photos.
        className="h-auto w-full rounded-lg bg-surface object-cover contrast-[1.05] grayscale"
      />
      {caption && (
        <figcaption className="text-small text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}
