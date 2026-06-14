import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getFileById, renameFile } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, newName } = await request.json();

    if (!id || !newName) {
      return NextResponse.json({ error: "ID and new name required" }, { status: 400 });
    }

    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const updatedFile = await renameFile(id, newName);

    return NextResponse.json({ file: updatedFile });
  } catch (error) {
    console.error("Rename error:", error);
    return NextResponse.json({ error: "Rename failed" }, { status: 500 });
  }
}
