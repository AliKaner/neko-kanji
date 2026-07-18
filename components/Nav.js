"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import Logo from "./Logo";

const LINKS = [
  { href: "/learn", key: "nav.learn" },
  { href: "/practice", key: "nav.practice" },
  { href: "/read", key: "nav.read" },
  { href: "/dictionary", key: "nav.dict" },
  { href: "/kanji", key: "nav.kanji" },
  { href: "/friends", key: "nav.friends" },
  { href: "/groups", key: "nav.groups" },
];

function SearchBox() {
  const { t } = useI18n();
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useQuery(
    api.search.all,
    debounced.trim() ? { term: debounced } : "skip"
  );

  const go = (href) => {
    setTerm("");
    setOpen(false);
    router.push(href);
  };

  const hasResults =
    results && (results.users.length > 0 || results.kanji.length > 0);

  return (
    <div className="nav-search" ref={boxRef}>
      <input
        className="nav-search-input"
        value={term}
        placeholder={t("search.placeholder")}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && term.trim() && (
        <div className="nav-search-dropdown">
          {results === undefined && (
            <div className="nav-search-hint">{t("loading")}</div>
          )}
          {results && !hasResults && (
            <div className="nav-search-hint">{t("search.none")}</div>
          )}
          {results?.users.length > 0 && (
            <>
              <div className="nav-search-label">{t("search.users")}</div>
              {results.users.map((u) => (
                <button
                  key={u.userId}
                  className="nav-search-item"
                  onClick={() => go(`/profile/${u.userId}`)}
                >
                  👤 {u.name}
                </button>
              ))}
            </>
          )}
          {results?.kanji.length > 0 && (
            <>
              <div className="nav-search-label">{t("search.kanji")}</div>
              {results.kanji.map((k) => (
                <button
                  key={k.rank}
                  className="nav-search-item"
                  onClick={() => go(`/dictionary?q=${encodeURIComponent(k.char)}`)}
                >
                  <span className="jp">{k.char}</span>
                  <span className="nav-search-rank">#{k.rank}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const { t, lang, setLang } = useI18n();
  const accountHref =
    isAuthenticated && viewer ? `/profile/${viewer._id}` : "/account";

  return (
    <header className="topbar">
      <div className="topbar-row">
        <Link href="/kanji" className="brand">
          <Logo size={42} />
          <span className="brand-text">
            <span className="brand-jp jp">猫漢字</span>
            <span className="brand-tr">NEKO KANJI</span>
          </span>
        </Link>
        <SearchBox />
        <div className="topbar-actions">
          <div className="lang-toggle">
            <button
              className={lang === "tr" ? "active" : ""}
              onClick={() => setLang("tr")}
            >
              TR
            </button>
            <button
              className={lang === "en" ? "active" : ""}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>
          <Link
            href={accountHref}
            className={`nav-account ${
              pathname.startsWith("/account") ||
              (viewer && pathname === `/profile/${viewer._id}`)
                ? "active"
                : ""
            }`}
          >
            {isAuthenticated ? t("nav.profile") : t("nav.login")}
          </Link>
        </div>
      </div>
      <nav className="nav">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname.startsWith(l.href) ? "active" : ""}
          >
            {t(l.key)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
