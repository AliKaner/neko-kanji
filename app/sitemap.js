const BASE = "https://neko-kanji.com";

export default function sitemap() {
  const routes = [
    { path: "", priority: 1 },
    { path: "/learn", priority: 0.9 },
    { path: "/practice", priority: 0.9 },
    { path: "/kanji", priority: 0.9 },
    { path: "/read", priority: 0.8 },
    { path: "/dictionary", priority: 0.8 },
    { path: "/friends", priority: 0.6 },
    { path: "/groups", priority: 0.6 },
    { path: "/account", priority: 0.5 },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: r.priority,
  }));
}
