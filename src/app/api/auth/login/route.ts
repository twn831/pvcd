import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "請輸入帳號和密碼" }, { status: 400 });
    }

    // Validate username and password from environment variables
    const validUsers = [
      { username: process.env.USERNAME_1, password: process.env.PASSWORD_1 },
      { username: process.env.USERNAME_2, password: process.env.PASSWORD_2 },
      { username: process.env.USERNAME_3, password: process.env.PASSWORD_3 },
    ];

    const isValid = validUsers.some(
      (user) => user.username && user.password && 
               user.username === username && user.password === password
    );

    if (!isValid) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    // Generate session token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登入失敗" }, { status: 500 });
  }
}
