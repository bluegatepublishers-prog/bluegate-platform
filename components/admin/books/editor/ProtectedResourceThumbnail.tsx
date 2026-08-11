"use client";

/* eslint-disable @next/next/no-img-element -- Authenticated Resource preview endpoints are intentionally not sent through the public image optimizer. */

export default function ProtectedResourceThumbnail({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return <img src={src} alt="" className={className} />;
}
