import {
  RiArrowRightLine,
  RiGlobalLine,
  RiServerLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import Link from "next/link";

import { getToolProcessing } from "@/lib/tool-processing";
import { type Tool, isNewTool } from "@/lib/tools";

type ToolCardStaticProps = {
  tool: Tool;
};

export function ToolCardStatic({ tool }: ToolCardStaticProps) {
  const processing = getToolProcessing(tool.href);
  const ProcessingIcon =
    processing.kind === "local"
      ? RiShieldCheckLine
      : processing.kind === "first-party-server"
        ? RiServerLine
        : RiGlobalLine;

  return (
    <div className="group/card relative h-full">
      <Link
        href={tool.href}
        className="flex h-full flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
      >
        <div className="flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/card:bg-primary/15">
            <tool.icon className="size-5" />
          </div>
          {tool.devOnly && (
            <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-500">
              DEV
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{tool.name}</h3>
            {isNewTool(tool) && (
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-emerald-600 dark:text-emerald-500">
                New
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {tool.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
          <span
            className={
              processing.kind === "local"
                ? "flex items-center gap-1 text-emerald-600 dark:text-emerald-500"
                : "flex items-center gap-1 text-amber-600 dark:text-amber-500"
            }
            title={processing.summary}
          >
            <ProcessingIcon className="size-3.5" aria-hidden />
            {processing.label}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 transition-colors group-hover/card:text-primary">
            Open tool
            <RiArrowRightLine className="size-3 transition-transform group-hover/card:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}
