"use client";

import { useState } from "react";
import type { ArchiveImage } from "@/lib/types";

/** Remote pictures can vanish. On failure the element disappears and the layout's typography carries the space. */
export function SafeImage({ image, className, sizes, fallback = null, priority }: { image: ArchiveImage; className?: string; sizes?: string; fallback?: React.ReactNode; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Commons serves sized thumbnails; the image optimiser has a small free quota.
    <img
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export function Credit({ image }: { image: ArchiveImage }) {
  return (
    <a href={image.pageUrl} rel="noreferrer" className="tag link text-[var(--mut)]">
      {image.credit} · {image.license}
    </a>
  );
}
