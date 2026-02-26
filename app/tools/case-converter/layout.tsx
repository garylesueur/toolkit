import type { ReactNode } from "react";
import { createToolMetadata } from "@/lib/tools-metadata";

export const metadata = createToolMetadata("case-converter");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
