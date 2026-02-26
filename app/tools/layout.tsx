import Link from "next/link"
import { RiArrowLeftLine } from "@remixicon/react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <nav className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <RiArrowLeftLine className="size-4" />
          Back to toolkit
        </Link>
        <ThemeToggle />
      </nav>
      {children}
    </div>
  )
}
