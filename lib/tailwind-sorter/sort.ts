interface CategoryDefinition {
  name: string;
  prefixes: string[];
}

/**
 * Tailwind utility categories in the officially recommended sort order.
 * Each prefix is matched against the base utility (variant prefixes stripped).
 * A prefix matches if the utility equals it exactly or starts with it followed by `-`.
 */
const CATEGORY_ORDER: CategoryDefinition[] = [
  {
    name: "Layout",
    prefixes: [
      "container",
      "columns",
      "break-after",
      "break-before",
      "break-inside",
      "box-decoration",
      "box",
      "block",
      "inline-block",
      "inline-flex",
      "inline-grid",
      "inline-table",
      "inline",
      "flex",
      "table",
      "grid",
      "hidden",
      "contents",
      "list-item",
      "flow-root",
      "float",
      "clear",
      "isolation",
      "isolate",
      "object",
      "overflow",
      "overscroll",
    ],
  },
  {
    name: "Flexbox & Grid",
    prefixes: [
      "basis",
      "flex",
      "grow",
      "shrink",
      "order",
      "grid-cols",
      "col-span",
      "col-start",
      "col-end",
      "grid-rows",
      "row-span",
      "row-start",
      "row-end",
      "grid-flow",
      "auto-cols",
      "auto-rows",
      "gap",
      "justify",
      "content",
      "items",
      "self",
      "place",
    ],
  },
  {
    name: "Spacing",
    prefixes: [
      "p",
      "px",
      "py",
      "pt",
      "pr",
      "pb",
      "pl",
      "m",
      "mx",
      "my",
      "mt",
      "mr",
      "mb",
      "ml",
      "space",
    ],
  },
  {
    name: "Sizing",
    prefixes: ["w", "min-w", "max-w", "h", "min-h", "max-h", "size"],
  },
  {
    name: "Positioning",
    prefixes: [
      "static",
      "fixed",
      "absolute",
      "relative",
      "sticky",
      "inset",
      "top",
      "right",
      "bottom",
      "left",
      "z",
    ],
  },
  {
    name: "Typography",
    prefixes: [
      "font",
      "text",
      "tracking",
      "leading",
      "list",
      "decoration",
      "underline",
      "overline",
      "line-through",
      "no-underline",
      "uppercase",
      "lowercase",
      "capitalize",
      "normal-case",
      "truncate",
      "indent",
      "align",
      "whitespace",
      "break",
      "hyphens",
    ],
  },
  {
    name: "Backgrounds",
    prefixes: ["bg", "from", "via", "to", "gradient"],
  },
  {
    name: "Borders",
    prefixes: [
      "rounded",
      "border",
      "divide",
      "outline",
      "ring-offset",
      "ring",
    ],
  },
  {
    name: "Effects",
    prefixes: ["shadow", "opacity", "mix-blend", "bg-blend"],
  },
  {
    name: "Filters",
    prefixes: [
      "blur",
      "brightness",
      "contrast",
      "drop-shadow",
      "grayscale",
      "hue-rotate",
      "invert",
      "saturate",
      "sepia",
      "backdrop",
    ],
  },
  {
    name: "Tables",
    prefixes: ["table", "caption", "border-collapse", "border-spacing"],
  },
  {
    name: "Transitions & Animation",
    prefixes: ["transition", "duration", "ease", "delay", "animate"],
  },
  {
    name: "Transforms",
    prefixes: ["scale", "rotate", "translate", "skew", "origin"],
  },
  {
    name: "Interactivity",
    prefixes: [
      "accent",
      "appearance",
      "cursor",
      "caret",
      "pointer-events",
      "resize",
      "scroll",
      "snap",
      "touch",
      "select",
      "will-change",
    ],
  },
  {
    name: "Accessibility",
    prefixes: ["sr-only", "not-sr-only", "forced-color-adjust"],
  },
];

const FALLBACK_CATEGORY_INDEX = CATEGORY_ORDER.length;

/**
 * Strips variant prefixes (e.g. `hover:`, `sm:`, `dark:`, `focus:`) from a
 * Tailwind class to get the base utility name.
 *
 * Variants are colon-separated prefixes. The base utility is everything after
 * the last colon.
 */
function stripVariants(className: string): string {
  const lastColon = className.lastIndexOf(":");
  if (lastColon === -1) return className;
  return className.slice(lastColon + 1);
}

/**
 * Determines the sort-priority index for a base utility by matching it against
 * the category prefix list. Returns `FALLBACK_CATEGORY_INDEX` for unrecognised
 * utilities so they sort to the end.
 */
function getCategoryIndex(baseUtility: string): number {
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    const category = CATEGORY_ORDER[i];
    for (const prefix of category.prefixes) {
      if (
        baseUtility === prefix ||
        baseUtility.startsWith(`${prefix}-`) ||
        baseUtility.startsWith(`-${prefix}-`) ||
        baseUtility === `-${prefix}`
      ) {
        return i;
      }
    }
  }
  return FALLBACK_CATEGORY_INDEX;
}

interface IndexedClass {
  original: string;
  categoryIndex: number;
  sourceIndex: number;
}

/**
 * Sorts a whitespace-separated string of Tailwind classes into the
 * recommended category order. Classes within the same category retain
 * their original relative order (stable sort).
 */
export function sortTailwindClasses(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const classes = trimmed.split(/\s+/);

  const indexed: IndexedClass[] = classes.map((cls, i) => ({
    original: cls,
    categoryIndex: getCategoryIndex(stripVariants(cls)),
    sourceIndex: i,
  }));

  indexed.sort((a, b) => {
    if (a.categoryIndex !== b.categoryIndex) {
      return a.categoryIndex - b.categoryIndex;
    }
    return a.sourceIndex - b.sourceIndex;
  });

  return indexed.map((entry) => entry.original).join(" ");
}
