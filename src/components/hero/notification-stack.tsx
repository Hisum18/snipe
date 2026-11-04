"use client";

import { motion, type Variants } from "framer-motion";

import { DiscordAppIcon, GmailAppIcon, MessagesAppIcon } from "@/components/hero/brand-logos";

const cardBase =
  "pointer-events-none flex w-[17.5rem] items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-float sm:w-[20rem]";

const popIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

interface NotificationCardProps {
  className?: string;
  style?: React.CSSProperties;
}

function CardHeader({ app, when }: { app: string; when: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">{app}</p>
      <span className="shrink-0 font-mono text-[0.6875rem] text-neutral-500">{when}</span>
    </div>
  );
}

export function DiscordNotification({ className, style }: NotificationCardProps) {
  return (
    <motion.div variants={popIn} style={style} className={`${cardBase} ${className ?? ""}`}>
      <DiscordAppIcon className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <CardHeader app="Discord" when="now" />
        <p className="text-sm font-normal">Snipe</p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
          New internship alert! Google — Software Engineering Intern. Apply now
          before it&apos;s too late.
        </p>
      </div>
    </motion.div>
  );
}

export function SmsNotification({ className, style }: NotificationCardProps) {
  return (
    <motion.div variants={popIn} style={style} className={`${cardBase} ${className ?? ""}`}>
      <MessagesAppIcon className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <CardHeader app="Messages" when="2m ago" />
        <p className="text-sm font-normal">Snipe</p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
          New internship: Microsoft. Apply early!
        </p>
      </div>
    </motion.div>
  );
}

export function EmailNotification({ className, style }: NotificationCardProps) {
  return (
    <motion.div variants={popIn} style={style} className={`${cardBase} ${className ?? ""}`}>
      <GmailAppIcon className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <CardHeader app="Gmail" when="3m ago" />
        <p className="text-sm font-normal">New internship opportunity</p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">
          Meta — Product Intern. Apply before the flood.
        </p>
      </div>
    </motion.div>
  );
}
