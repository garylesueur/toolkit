import type { ReactNode } from "react";

import { createToolMetadata } from "@/lib/tools-metadata";

export const metadata = createToolMetadata("pdf-active-content");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
