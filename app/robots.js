const BASE = "https://japanese-teacher-delta.vercel.app";

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
