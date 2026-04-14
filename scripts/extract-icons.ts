/**
 * One-off script to extract SVG path data from @remixicon/react components.
 *
 * Usage:
 *   npx tsx scripts/extract-icons.ts > lib/logo-generator/icons.ts
 *
 * Each Remixicon component, when called as a function, returns a React element
 * tree: { type: "svg", props: { children: { type: "path", props: { d: "..." } } } }
 *
 * We extract the `d` attribute from both Line and Fill variants.
 */

/* eslint-disable no-console */

// Curated icon base names (without Ri prefix or Line/Fill suffix)
const CURATED_ICONS: { name: string; keywords: string[] }[] = [
  // General
  { name: "Home", keywords: ["house", "main"] },
  { name: "Settings", keywords: ["gear", "cog", "config"] },
  { name: "Star", keywords: ["favourite", "rating"] },
  { name: "Heart", keywords: ["love", "like", "favourite"] },
  { name: "Shield", keywords: ["security", "protection", "safe"] },
  { name: "Search", keywords: ["find", "magnify", "lookup"] },
  { name: "Eye", keywords: ["view", "visible", "watch"] },
  { name: "Lightbulb", keywords: ["idea", "tip", "bright"] },
  { name: "Bookmark", keywords: ["save", "mark"] },
  { name: "Flag", keywords: ["report", "mark", "country"] },
  { name: "Trophy", keywords: ["award", "prize", "win"] },
  { name: "Medal", keywords: ["award", "achievement"] },
  { name: "VerifiedBadge", keywords: ["check", "approved", "trusted"] },
  { name: "ThumbUp", keywords: ["like", "approve", "good"] },
  { name: "Fire", keywords: ["flame", "hot", "trending"] },
  { name: "Flashlight", keywords: ["torch", "light", "beam"] },
  { name: "Key", keywords: ["password", "access", "auth"] },
  { name: "Lock", keywords: ["secure", "private", "auth"] },
  { name: "Compass", keywords: ["direction", "navigate", "explore"] },
  { name: "MapPin", keywords: ["location", "place", "marker"] },
  { name: "Time", keywords: ["clock", "watch", "hour"] },
  { name: "Alarm", keywords: ["clock", "alert", "reminder"] },
  { name: "Calendar", keywords: ["date", "schedule", "event"] },
  { name: "Notification", keywords: ["bell", "alert"] },
  { name: "Information", keywords: ["info", "about", "help"] },
  { name: "Question", keywords: ["help", "support", "faq"] },

  // Development
  { name: "Code", keywords: ["dev", "programming", "brackets"] },
  { name: "Terminal", keywords: ["cli", "console", "shell"] },
  { name: "GitBranch", keywords: ["version", "branch", "merge"] },
  { name: "GitCommit", keywords: ["version", "save"] },
  { name: "GitMerge", keywords: ["version", "merge"] },
  { name: "GitRepository", keywords: ["repo", "version"] },
  { name: "Bug", keywords: ["debug", "error", "issue"] },
  { name: "Braces", keywords: ["code", "json", "object"] },
  { name: "Database", keywords: ["db", "storage", "data"] },
  { name: "Server", keywords: ["backend", "hosting", "infra"] },
  { name: "Cloud", keywords: ["hosting", "saas", "upload"] },
  { name: "Command", keywords: ["keyboard", "shortcut"] },
  { name: "Cpu", keywords: ["processor", "chip", "hardware"] },
  { name: "HardDrive", keywords: ["disk", "storage"] },
  { name: "Puzzle", keywords: ["plugin", "extension", "piece"] },
  { name: "Tools", keywords: ["wrench", "repair", "fix"] },

  // Business & Office
  { name: "Briefcase", keywords: ["work", "job", "business"] },
  { name: "Building", keywords: ["office", "company", "enterprise"] },
  { name: "Building2", keywords: ["office", "company", "city"] },
  { name: "Store", keywords: ["shop", "retail", "market"] },
  { name: "ShoppingBag", keywords: ["ecommerce", "buy", "purchase"] },
  { name: "ShoppingCart", keywords: ["ecommerce", "buy", "cart"] },
  { name: "BarChart", keywords: ["analytics", "graph", "stats"] },
  { name: "LineChart", keywords: ["analytics", "graph", "trend"] },
  { name: "PieChart", keywords: ["analytics", "graph", "data"] },
  { name: "Presentation", keywords: ["slides", "deck", "meeting"] },
  { name: "FileText", keywords: ["document", "page", "text"] },
  { name: "Folder", keywords: ["directory", "files", "organize"] },
  { name: "Inbox", keywords: ["mail", "receive", "messages"] },
  { name: "Team", keywords: ["group", "people", "users"] },
  { name: "User", keywords: ["person", "account", "profile"] },
  { name: "UserAdd", keywords: ["person", "register", "signup"] },
  { name: "Group", keywords: ["people", "team", "community"] },

  // Social & Brands
  { name: "Github", keywords: ["git", "code", "repository"] },
  { name: "Twitter", keywords: ["social", "tweet", "x"] },
  { name: "TwitterX", keywords: ["social", "tweet", "x"] },
  { name: "Discord", keywords: ["chat", "community", "gaming"] },
  { name: "Slack", keywords: ["chat", "work", "messaging"] },
  { name: "Linkedin", keywords: ["social", "professional", "job"] },
  { name: "Youtube", keywords: ["video", "stream", "channel"] },
  { name: "Instagram", keywords: ["social", "photo", "stories"] },
  { name: "Facebook", keywords: ["social", "meta", "network"] },
  { name: "Twitch", keywords: ["stream", "gaming", "live"] },
  { name: "Spotify", keywords: ["music", "audio", "stream"] },
  { name: "Dribbble", keywords: ["design", "portfolio", "shots"] },
  { name: "Figma", keywords: ["design", "ui", "prototype"] },
  { name: "Notion", keywords: ["docs", "wiki", "notes"] },

  // Media & Content
  { name: "Play", keywords: ["start", "video", "media"] },
  { name: "Music", keywords: ["audio", "song", "note"] },
  { name: "Headphone", keywords: ["audio", "listen", "music"] },
  { name: "Mic", keywords: ["microphone", "voice", "audio"] },
  { name: "Camera", keywords: ["photo", "picture", "snap"] },
  { name: "Film", keywords: ["video", "movie", "cinema"] },
  { name: "Image", keywords: ["photo", "picture", "gallery"] },
  { name: "Palette", keywords: ["colour", "art", "design"] },
  { name: "PaintBrush", keywords: ["art", "draw", "design"] },
  { name: "BallPen", keywords: ["write", "edit", "draw", "pen"] },
  { name: "Pencil", keywords: ["write", "edit", "draw"] },
  { name: "QuillPen", keywords: ["write", "quill", "pen", "author"] },
  { name: "Scissors", keywords: ["cut", "trim", "edit"] },

  // Communication
  { name: "Mail", keywords: ["email", "message", "inbox"] },
  { name: "Chat1", keywords: ["message", "talk", "bubble"] },
  { name: "Chat3", keywords: ["message", "talk", "bubble"] },
  { name: "Message", keywords: ["text", "sms", "chat"] },
  { name: "Phone", keywords: ["call", "mobile", "telephone"] },
  { name: "Smartphone", keywords: ["mobile", "device", "phone"] },
  { name: "SendPlane", keywords: ["submit", "share", "send", "plane"] },
  { name: "Share", keywords: ["social", "link", "distribute"] },
  { name: "ExternalLink", keywords: ["url", "chain", "connect", "link"] },
  { name: "Attachment", keywords: ["file", "clip", "attach"] },
  { name: "Globe", keywords: ["world", "earth", "web", "internet"] },

  // Nature & Weather
  { name: "Leaf", keywords: ["plant", "nature", "eco", "green"] },
  { name: "Plant", keywords: ["seedling", "grow", "nature"] },
  { name: "Seedling", keywords: ["plant", "grow", "sprout"] },
  { name: "Sun", keywords: ["light", "day", "bright", "weather"] },
  { name: "Moon", keywords: ["night", "dark", "sleep"] },
  { name: "Cloudy", keywords: ["weather", "sky", "cloud"] },
  { name: "Rainy", keywords: ["weather", "rain", "drops"] },
  { name: "Thunderstorms", keywords: ["weather", "storm", "lightning"] },
  { name: "Snowflake", keywords: ["cold", "winter", "ice"] },
  { name: "Drop", keywords: ["water", "liquid", "rain"] },
  { name: "Flower", keywords: ["nature", "bloom", "garden"] },
  { name: "Earth", keywords: ["world", "planet", "globe"] },

  // Transport & Travel
  { name: "Rocket", keywords: ["launch", "startup", "fast", "space"] },
  { name: "Plane", keywords: ["flight", "travel", "air"] },
  { name: "Ship", keywords: ["boat", "sail", "ocean"] },
  { name: "Car", keywords: ["vehicle", "drive", "auto"] },
  { name: "Bus", keywords: ["transport", "public", "travel"] },
  { name: "Bike", keywords: ["cycle", "bicycle", "ride"] },
  { name: "Train", keywords: ["rail", "metro", "transport"] },
  { name: "Compass3", keywords: ["direction", "navigate", "explore"] },
  { name: "Map", keywords: ["location", "navigate", "directions"] },
  { name: "Navigation", keywords: ["arrow", "direction", "gps"] },

  // Finance
  { name: "Wallet", keywords: ["money", "pay", "finance"] },
  { name: "BankCard", keywords: ["credit", "debit", "payment"] },
  { name: "Coin", keywords: ["money", "currency", "cash"] },
  { name: "MoneyDollarCircle", keywords: ["currency", "usd", "finance"] },
  { name: "Exchange", keywords: ["swap", "trade", "convert"] },
  { name: "Stock", keywords: ["market", "trading", "finance"] },
  { name: "Funds", keywords: ["money", "investment", "finance"] },

  // Shapes & Symbols
  { name: "Add", keywords: ["plus", "new", "create"] },
  { name: "Subtract", keywords: ["minus", "remove"] },
  { name: "Close", keywords: ["x", "remove", "delete", "cancel"] },
  { name: "Check", keywords: ["tick", "done", "complete", "yes"] },
  { name: "CheckDouble", keywords: ["tick", "done", "verified"] },
  { name: "ArrowRightUp", keywords: ["direction", "pointer", "arrow"] },
  { name: "Sparkling", keywords: ["magic", "ai", "sparkle", "star"] },
  { name: "Magic", keywords: ["wand", "ai", "auto"] },
  { name: "LightbulbFlash", keywords: ["bolt", "fast", "power", "electric", "lightning", "idea"] },
  { name: "Recycle", keywords: ["refresh", "reuse", "green"] },
  { name: "Infinity", keywords: ["loop", "forever", "unlimited"] },

  // Food & Lifestyle
  { name: "Cup", keywords: ["coffee", "tea", "drink", "cafe"] },
  { name: "Cake", keywords: ["birthday", "celebrate", "dessert"] },
  { name: "Restaurant", keywords: ["food", "dining", "cutlery"] },
  { name: "Gamepad", keywords: ["gaming", "controller", "play"] },

  // Health & Wellness
  { name: "HeartPulse", keywords: ["health", "medical", "heartbeat"] },
  { name: "Hospital", keywords: ["medical", "health", "clinic"] },
  { name: "Stethoscope", keywords: ["doctor", "medical", "health"] },
  { name: "Capsule", keywords: ["medicine", "pill", "drug"] },
  { name: "MentalHealth", keywords: ["brain", "wellness", "mind"] },

  // Education
  { name: "GraduationCap", keywords: ["education", "school", "degree"] },
  { name: "Book", keywords: ["read", "library", "study"] },
  { name: "BookOpen", keywords: ["read", "library", "study"] },
  { name: "Newspaper", keywords: ["news", "article", "press"] },

  // Misc
  { name: "Robot", keywords: ["ai", "bot", "automation"] },
  { name: "Aliens", keywords: ["space", "ufo", "extraterrestrial", "alien"] },
  { name: "Ghost", keywords: ["spooky", "halloween", "spirit"] },
  { name: "Skull", keywords: ["danger", "death", "pirate"] },
  { name: "Vip", keywords: ["premium", "exclusive", "special"] },
  { name: "VipCrown", keywords: ["king", "queen", "royal", "premium", "crown"] },
  { name: "Gift", keywords: ["present", "reward", "surprise"] },
  { name: "Clapperboard", keywords: ["movie", "film", "action"] },
  { name: "Anchor", keywords: ["link", "marine", "stable"] },
  { name: "Fingerprint", keywords: ["identity", "biometric", "auth"] },
  { name: "QrCode", keywords: ["scan", "barcode", "link"] },
];

// Remove duplicate names
const seen = new Set<string>();
const UNIQUE_ICONS = CURATED_ICONS.filter((icon) => {
  if (seen.has(icon.name)) return false;
  seen.add(icon.name);
  return true;
});

function extractPath(
  mod: Record<string, (props: Record<string, unknown>) => { props: { children: { props: { d: string } } | Array<{ props: { d: string } }> } }>,
  componentName: string,
): string | null {
  const Component = mod[componentName];
  if (!Component) return null;

  try {
    const el = Component({ size: 24 });
    const children = el.props.children;

    // Single path child
    if (!Array.isArray(children)) {
      return children?.props?.d ?? null;
    }

    // Multiple path children - combine all d attributes
    return children
      .map((child: { props: { d: string } }) => child.props.d)
      .filter(Boolean)
      .join(" ");
  } catch {
    return null;
  }
}

async function main() {
  const mod = await import("@remixicon/react");

  const entries: string[] = [];
  let skipped = 0;

  for (const icon of UNIQUE_ICONS) {
    // Try various naming patterns Remixicon uses
    const lineName = `Ri${icon.name}Line`;
    const fillName = `Ri${icon.name}Fill`;

    let linePath = extractPath(mod, lineName);
    let fillPath = extractPath(mod, fillName);

    // Some icons don't have Line suffix (e.g., RiTimeLine already ends in Line)
    // Handle cases where the name itself contains Line/Fill
    if (!linePath && icon.name.endsWith("Line")) {
      const base = icon.name.slice(0, -4);
      linePath = extractPath(mod, `Ri${base}Line`);
      fillPath = extractPath(mod, `Ri${base}Fill`);
      if (linePath) {
        // Fix the name
        icon.name = base;
      }
    }

    if (!linePath) {
      console.error(`SKIP: ${icon.name} (no Ri${icon.name}Line found)`);
      skipped++;
      continue;
    }

    // If no fill variant, use line path as fallback
    if (!fillPath) {
      fillPath = linePath;
    }

    const kw = JSON.stringify(icon.keywords);
    entries.push(
      `  {\n    name: ${JSON.stringify(icon.name)},\n    keywords: ${kw},\n    linePath: "${linePath}",\n    fillPath: "${fillPath}",\n  }`,
    );
  }

  const output = `// Auto-generated by scripts/extract-icons.ts — do not edit manually

export interface IconEntry {
  /** Display name */
  name: string;
  /** Search keywords */
  keywords: string[];
  /** SVG path d attribute for outline variant (24x24 viewBox) */
  linePath: string;
  /** SVG path d attribute for filled variant (24x24 viewBox) */
  fillPath: string;
}

export const ICON_ENTRIES: IconEntry[] = [
${entries.join(",\n")},
];
`;

  console.log(output);
  console.error(
    `\nDone: ${entries.length} icons extracted, ${skipped} skipped`,
  );
}

main();
