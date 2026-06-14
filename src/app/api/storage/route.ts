import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getStorageUsed } from "@/lib/db";

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = parseInt(process.env.STORAGE_LIMIT || "10737418240", 10); // 10GB default
    const used = await getStorageUsed();
    const percentage = Math.min((used / limit) * 100, 100);

    return NextResponse.json({
      used,
      limit,
      percentage,
    });
  } catch (error) {
    console.error("Storage check error:", error);
    return NextResponse.json({ error: "Failed to check storage" }, { status: 500 });
  }
}
