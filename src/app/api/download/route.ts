import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getFileById } from "@/lib/db";
import { getFileUrl, downloadFile } from "@/lib/r2";
import JSZip from "jszip";
import { listFiles as listDbFiles } from "@/lib/db";
import { FileItem } from "@/types";

async function addFolderContentsToZip(
  zip: JSZip,
  path: string,
  parentFolder: JSZip | null
): Promise<void> {
  const files = await listDbFiles(path);

  for (const file of files) {
    if (file.isFolder) {
      const subFolder = parentFolder?.folder(file.name);
      if (subFolder) {
        await addFolderContentsToZip(zip, file.path, subFolder);
      }
    } else {
      try {
        const fileData = await downloadFile(file.path);
        if (parentFolder) {
          parentFolder.file(file.name, fileData);
        } else {
          zip.file(file.name, fileData);
        }
      } catch {
        // Skip files that don't exist in R2
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const multiple = searchParams.get("multiple");
    const ids = searchParams.get("ids");

    if (multiple === "true" && ids) {
      const fileIds = ids.split(",");
      const zip = new JSZip();

      for (const fileId of fileIds) {
        const file = await getFileById(fileId);
        if (file && !file.isFolder) {
          try {
            const fileData = await downloadFile(file.path);
            zip.file(file.name, fileData);
          } catch {
            // Skip files that don't exist in R2
          }
        }
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      return new Response(new Uint8Array(zipBuffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="download-${Date.now()}.zip"`,
        },
      });
    }

    if (!id) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.isFolder) {
      const zip = new JSZip();
      const folderZip = zip.folder(file.name);

      await addFolderContentsToZip(zip, file.path, folderZip);

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      return new Response(new Uint8Array(zipBuffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${file.name}.zip"`,
        },
      });
    }

    const url = await getFileUrl(file.path, 3600);
    return NextResponse.json({ url, file });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
