"use client";

import { RiSearchLine, RiCloseLine } from "@remixicon/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
  InputGroupText,
} from "@/components/ui/input-group";

const SEARCH_PARAM_KEY = "q";
const DEBOUNCE_MS = 300;

export function ToolsSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = searchParams.get(SEARCH_PARAM_KEY) ?? "";
  const [value, setValue] = useState(query);

  useEffect(() => setValue(query), [query]);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const updateSearchParam = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        startTransition(() => {
          const params = new URLSearchParams(searchParams.toString());
          if (value) {
            params.set(SEARCH_PARAM_KEY, value);
          } else {
            params.delete(SEARCH_PARAM_KEY);
          }
          const qs = params.toString();
          router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
        });
      }, DEBOUNCE_MS);
    },
    [searchParams, router, pathname, startTransition],
  );

  const clearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValue("");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(SEARCH_PARAM_KEY);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  }, [searchParams, router, pathname, startTransition]);

  return (
    <div className="w-full max-w-xs">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <RiSearchLine className="size-4" />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          autoFocus
          placeholder="Search tools…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            updateSearchParam(e.target.value);
          }}
          aria-label="Search tools"
        />
        {value && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <RiCloseLine className="size-3.5" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
        {!value && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>
              <kbd className="text-muted-foreground hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                Ctrl K
              </kbd>
            </InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}
