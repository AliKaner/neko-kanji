"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth } from "convex/react";

const LINKS = [
  { href: "/learn", label: "📖 Harf Öğren" },
  { href: "/practice", label: "🎲 Pratik" },
  { href: "/read", label: "📜 Okuma" },
  { href: "/dictionary", label: "🔍 Sözlük" },
  { href: "/kanji", label: "🗾 Kanji Haritası" },
  { href: "/friends", label: "👥 Arkadaşlar" },
  { href: "/groups", label: "🏆 Gruplar" },
];

export default function Nav() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-jp jp">日本語の先生</span>
        <span className="brand-tr">JAPONCA ÖĞRETMENİM</span>
      </div>
      <nav className="nav">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname.startsWith(l.href) ? "active" : ""}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/account"
          className={pathname.startsWith("/account") ? "active" : ""}
        >
          {isAuthenticated ? "👤 Hesabım" : "👤 Giriş"}
        </Link>
      </nav>
    </header>
  );
}
