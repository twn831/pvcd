import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createFolder } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, parentPath } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Folder name required" }, { status: 400 });
    }

    const parent = parentPath || "/";
    const folder = await createFolder(name, parent);

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
