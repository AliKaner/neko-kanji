const BASE = "https://neko-kanji.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profile/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
