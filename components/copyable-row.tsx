"use client";

import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/use-clipboard";

interface CopyableRowProps {
  label: string;
  value: string;
}

function CopyableRow({ label, value }: CopyableRowProps) {
  const { copy, copied: isCopied, error } = useClipboard(value);

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <p className="truncate font-mono text-sm">{value}</p>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => void copy()}
        aria-label={`${isCopied ? "Copied" : "Copy"} ${label}`}
        disabled={!value}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  );
}

export { CopyableRow };
export type { CopyableRowProps };
