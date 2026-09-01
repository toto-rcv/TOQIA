import type { MetadataRoute } from "next";

import { sitioUrl } from "@/lib/utils";

/** Una sola página pública, pero declarada: es lo que Google pide primero. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = sitioUrl();

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
