import "./globals.css";
import { Nunito, Zen_Maru_Gothic } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { I18nProvider } from "@/lib/i18n";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-ui",
});

const zenMaru = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-jp",
});

const SITE_URL = "https://japanese-teacher-delta.vercel.app";
const SITE_NAME = "猫漢字 Neko Kanji";
const SITE_DESC =
  "Hiragana, katakana ve en sık kullanılan 2500 kanjiyi öğren; ilerlemeni GitHub tarzı haritada izle, arkadaşlarınla ve gruplarla yarış. Learn the top 2500 Japanese kanji with friends.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "猫漢字 Neko Kanji — Japonca Öğren | Learn Japanese",
    template: "%s | 猫漢字 Neko Kanji",
  },
  description: SITE_DESC,
  keywords: [
    "japonca öğren",
    "kanji",
    "top 2500 kanji",
    "hiragana",
    "katakana",
    "japonca kelime",
    "learn japanese",
    "kanji practice",
    "JLPT",
    "neko kanji",
  ],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "猫漢字 Neko Kanji — Japonca Öğren",
    description: SITE_DESC,
    locale: "tr_TR",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "猫漢字 Neko Kanji — Top 2500 kanji",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "猫漢字 Neko Kanji — Japonca Öğren",
    description: SITE_DESC,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={`${nunito.variable} ${zenMaru.variable}`}>
        <ConvexClientProvider>
          <I18nProvider>
            <Nav />
            <main className="container">{children}</main>
            <Footer />
          </I18nProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
