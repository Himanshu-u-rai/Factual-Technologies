import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/services", "/work", "/about", "/contact"],
      disallow: ["/admin", "/admin/", "/api", "/api/"],
    },
  };
}
