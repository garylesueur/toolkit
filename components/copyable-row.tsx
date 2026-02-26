"use client"

import { Button } from "@/components/ui/button"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

interface CopyableRowProps {
  label: string
  value: string
  copiedValue: string | null
  onCopy: (value: string) => void
}

function CopyableRow({ label, value, copiedValue, onCopy }: CopyableRowProps) {
  const isCopied = copiedValue === value

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onCopy(value)}
        disabled={!value}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  )
}

export { CopyableRow }
export type { CopyableRowProps }
