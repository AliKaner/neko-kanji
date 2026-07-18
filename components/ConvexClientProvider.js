"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ||
    "https://next-penguin-734.eu-west-1.convex.cloud"
);

export default function ConvexClientProvider({ children }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
