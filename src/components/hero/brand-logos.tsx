import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Real third-party logos (official files in public/logos/, from Wikimedia
 * Commons; Discord's Clyde from Simple Icons, traced from Discord's brand
 * kit) for the product mockups. They keep their own brand colors — they're
 * illustration content depicting real apps, not part of Snipe's palette.
 * Decorative (alt=""): each one sits next to a text label naming it.
 */
type LogoProps = { className?: string };

function Logo({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      <Image src={src} alt="" fill unoptimized className="object-contain" />
    </span>
  );
}

export const GoogleLogo = ({ className }: LogoProps) => (
  <Logo src="/logos/google.svg" className={className} />
);
export const MicrosoftLogo = ({ className }: LogoProps) => (
  <Logo src="/logos/microsoft.svg" className={className} />
);
export const MetaLogo = ({ className }: LogoProps) => (
  <Logo src="/logos/meta.svg" className={className} />
);

/* Alert-channel app icons, shaped like they'd appear in a phone notification. */

export const DiscordAppIcon = ({ className }: LogoProps) => (
  <Logo src="/logos/discord.svg" className={className} />
);
export const MessagesAppIcon = ({ className }: LogoProps) => (
  <Logo src="/logos/messages.svg" className={className} />
);
/** Gmail's app icon is the M on a white tile. */
export const GmailAppIcon = ({ className }: LogoProps) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center justify-center rounded-[22%] bg-[#fff] ring-1 ring-white/[0.08]",
      className,
    )}
  >
    <Logo src="/logos/gmail.svg" className="h-[58%] w-[58%]" />
  </span>
);
