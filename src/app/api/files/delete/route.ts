import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getFileById, deleteFileById, deleteFolderAndContents } from "@/lib/db";
import { deleteFile, listFiles, deleteFiles as deleteR2Files } from "@/lib/r2";
import { normalizePath } from "@/lib/utils";

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.isFolder) {
      const pathsToDelete = await deleteFolderAndContents(file.path);

      for (const path of pathsToDelete) {
        try {
          await deleteFile(path);
        } catch {
          // File might not exist in R2, continue
        }
      }

      const r2Prefix = file.path + "/";
      const r2Files = await listFiles(r2Prefix);
      if (r2Files.length > 0) {
        await deleteR2Files(r2Files);
      }
    } else {
      await deleteFileById(id);
      try {
        await deleteFile(file.path);
      } catch {
        // File might not exist in R2
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
