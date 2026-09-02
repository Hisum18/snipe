"use server";

import { signOut } from "@/auth";

/** Sign the current user out and return to the landing page. */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
