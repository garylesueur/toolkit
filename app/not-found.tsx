import { RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
        That page does not exist in Toolkit. Try the home page to browse all
        developer utilities.
      </p>
      <Link
        href="/"
        className="hover:text-foreground mt-8 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
      >
        <RiArrowLeftLine className="size-4" aria-hidden />
        Back to Toolkit
      </Link>
    </div>
  );
}
