import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "cloud_session";
const SESSION_EXPIRY_DAYS = 7;

export function validatePassword(password: string): boolean {
  const passwords = [
    process.env.PASSWORD_1,
    process.env.PASSWORD_2,
    process.env.PASSWORD_3,
  ].filter(Boolean);

  return passwords.includes(password);
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getSessionToken();
  return Boolean(token && token.length > 0);
}
