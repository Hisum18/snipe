import "server-only";

import { Redis } from "@upstash/redis";

import { getServerEnv } from "@/env";

let cached: Redis | null = null;

export function getRedis(): Redis {
  if (cached) return cached;
  const env = getServerEnv();
  cached = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return cached;
}
