import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { uploadFile } from "@/lib/r2";
import { createFile } from "@/lib/db";
import { normalizePath, joinPath, getFileType } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parentPath = formData.get("parentPath") as string || "/";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const normalizedParent = normalizePath(parentPath);
    const fileType = getFileType(file.name, false);

    const r2Key = joinPath(normalizedParent, file.name);

    await uploadFile(r2Key, buffer, file.type || "application/octet-stream");

    const fileRecord = await createFile(
      file.name,
      normalizedParent,
      file.size,
      fileType
    );

    return NextResponse.json({ file: fileRecord });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
