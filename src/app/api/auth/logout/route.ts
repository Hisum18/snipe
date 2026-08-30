import { NextResponse } from "next/server";

import { getServerEnv } from "@/env";
import { destroyCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  await destroyCurrentSession();
  return NextResponse.redirect(new URL("/", getServerEnv().APP_URL), {
    status: 303,
  });
}
