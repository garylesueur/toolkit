import {
  RiGlobalLine,
  RiServerLine,
  RiShieldCheckLine,
} from "@remixicon/react";

import { getToolProcessing } from "@/lib/tool-processing";

type ProcessingDisclosureProps = {
  href: string;
};

export function ProcessingDisclosure({ href }: ProcessingDisclosureProps) {
  const processing = getToolProcessing(href);
  const Icon =
    processing.kind === "local"
      ? RiShieldCheckLine
      : processing.kind === "first-party-server"
        ? RiServerLine
        : RiGlobalLine;

  return (
    <aside className="mt-3 flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-sky-500" aria-hidden />
      <div className="text-xs leading-relaxed">
        <p className="font-medium">{processing.label}</p>
        <p className="text-muted-foreground mt-0.5">{processing.summary}</p>
      </div>
    </aside>
  );
}
