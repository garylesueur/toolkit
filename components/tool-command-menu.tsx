"use client";

import { RiSearchLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import { searchTools } from "@/lib/tool-search";
import { visibleTools } from "@/lib/tools";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 10;

export function ToolCommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () =>
      (query ? searchTools(visibleTools, query) : visibleTools).slice(
        0,
        MAX_RESULTS,
      ),
    [query],
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, []);

  const openTool = useCallback(
    (href: string) => {
      handleOpenChange(false);
      router.push(href);
    },
    [handleOpenChange, router],
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => setActiveIndex(0), [query]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="bg-popover text-popover-foreground fixed top-[18%] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border shadow-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">
            Find a tool
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search the toolkit and open a result.
          </DialogPrimitive.Description>

          <div className="flex items-center gap-3 border-b px-4">
            <RiSearchLine
              className="text-muted-foreground size-5 shrink-0"
              aria-hidden
            />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((current) =>
                    Math.min(current + 1, Math.max(results.length - 1, 0)),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((current) => Math.max(current - 1, 0));
                } else if (event.key === "Enter" && results[activeIndex]) {
                  event.preventDefault();
                  openTool(results[activeIndex].href);
                }
              }}
              placeholder="Search tools…"
              aria-label="Search command menu"
              className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <kbd className="text-muted-foreground hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ESC
            </kbd>
          </div>

          <div className="max-h-[min(55vh,28rem)] overflow-y-auto p-2">
            {results.length > 0 ? (
              <div aria-label="Tool results">
                {results.map((tool, index) => (
                  <button
                    key={tool.href}
                    type="button"
                    aria-current={index === activeIndex ? "true" : undefined}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => openTool(tool.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                      index === activeIndex &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
                      <tool.icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {tool.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {tool.description}
                      </span>
                    </span>
                    {index === activeIndex && (
                      <kbd className="text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
                        ↵
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground px-3 py-10 text-center text-sm">
                No tools match &ldquo;{query}&rdquo;
              </p>
            )}
          </div>

          <div className="text-muted-foreground flex items-center gap-4 border-t bg-muted/40 px-4 py-2 text-[11px]">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
