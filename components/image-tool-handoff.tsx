"use client";

import { RiArrowRightLine, RiShareForwardLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { storeImageHandoff } from "@/lib/tool-handoff/storage";
import type {
  ImageHandoffArtifact,
  ImageHandoffDestination,
} from "@/lib/tool-handoff/types";

type ImageToolHandoffProps = {
  destinations: ImageHandoffDestination[];
  getArtifact: () => Promise<ImageHandoffArtifact>;
  label?: string;
};

export function ImageToolHandoff({
  destinations,
  getArtifact,
  label = "Use in another tool",
}: ImageToolHandoffProps) {
  const router = useRouter();
  const [transferring, setTransferring] = useState(false);

  const handleDestination = useCallback(
    async (destination: ImageHandoffDestination) => {
      setTransferring(true);
      try {
        await storeImageHandoff(await getArtifact());
        router.push(destination.href);
      } finally {
        setTransferring(false);
      }
    },
    [getArtifact, router],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" disabled={transferring}>
          <RiShareForwardLine data-icon="inline-start" aria-hidden />
          {transferring ? "Preparing…" : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Continue with this image</DropdownMenuLabel>
        {destinations.map((destination) => (
          <DropdownMenuItem
            key={destination.href}
            onClick={() => handleDestination(destination)}
          >
            {destination.label}
            <RiArrowRightLine className="ml-auto" aria-hidden />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
