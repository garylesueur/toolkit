import { RiShieldCheckLine } from "@remixicon/react";

interface PrivacyBannerProps {
  children: React.ReactNode;
}

export function PrivacyBanner({ children }: PrivacyBannerProps) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
      <RiShieldCheckLine className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-xs leading-relaxed text-primary">{children}</p>
    </div>
  );
}
