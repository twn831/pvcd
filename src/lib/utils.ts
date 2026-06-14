export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
    }
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function getFileType(name: string, isFolder: boolean): string {
  if (isFolder) return "folder";

  const ext = name.split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"];
  const videoExts = ["mp4", "webm", "avi", "mov", "mkv", "flv", "wmv"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];
  const docExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods"];
  const textExts = ["txt", "md", "json", "xml", "html", "css", "js", "ts", "py", "java", "c", "cpp", "h", "sh", "yaml", "yml", "toml", "ini", "cfg", "log"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];

  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  if (docExts.includes(ext)) return "document";
  if (textExts.includes(ext)) return "text";
  if (archiveExts.includes(ext)) return "archive";
  return "file";
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  let normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized !== "/" && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized || "/";
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

export function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") return "/";
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/") || "/";
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
