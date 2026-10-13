"use client";

import { useState } from "react";
import { isExternalUrl, youtubeId } from "@/lib/media";
import type { BlockProps } from "../block-props";

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

/**
 * YouTube via youtube-nocookie.com, loaded only after the user presses play
 * so nothing is fetched from Google before they choose to watch.
 */
function YouTubeVideo({ id, poster }: { id: string; poster?: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title="YouTube video player"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full rounded-lg border-0 bg-black"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative grid aspect-video w-full place-items-center overflow-hidden rounded-lg bg-surface bg-cover bg-center"
      style={poster ? { backgroundImage: `url("${poster}")` } : undefined}
    >
      <span className="sr-only">Play video (loads YouTube)</span>
      <span
        aria-hidden="true"
        className="grid size-16 place-items-center rounded-pill bg-lime pl-1 text-ink shadow-card transition-transform group-hover:scale-105 motion-reduce:transition-none"
      >
        <PlayIcon />
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-3 rounded-pill bg-ink/80 px-3 py-1 text-small text-muted"
      >
        Plays from YouTube
      </span>
    </button>
  );
}

export function VideoBlock({ url, captionsUrl, poster }: BlockProps<"VIDEO">) {
  const id = youtubeId(url);
  if (id) return <YouTubeVideo id={id} poster={poster} />;

  // Cross-origin caption files need CORS-enabled loading.
  const crossOrigin = [url, captionsUrl].some((u) => u && isExternalUrl(u))
    ? "anonymous"
    : undefined;

  return (
    <video
      controls
      preload="metadata"
      poster={poster}
      crossOrigin={crossOrigin}
      className="aspect-video w-full rounded-lg bg-black"
    >
      <source src={url} />
      {captionsUrl && (
        <track
          kind="captions"
          src={captionsUrl}
          srcLang="en"
          label="English"
          default
        />
      )}
      Your browser can&apos;t play this video.{" "}
      <a href={url} className="text-lime underline">
        Download it instead
      </a>
      .
    </video>
  );
}
