"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileItem, SortConfig } from "@/types";
import {
  Folder,
  File,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  FileCode,
  Download,
  Trash2,
  Edit2,
  MoreVertical,
  X,
  ChevronRight,
  Search,
  Check,
  FolderPlus,
  Upload,
  LogOut,
  Cloud,
} from "lucide-react";

export default function DrivePage() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortConfig>({ field: "name", direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null);
  const [renameFile, setRenameFile] = useState<FileItem | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [storageInfo, setStorageInfo] = useState({ used: 0, limit: 10737418240, percentage: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles();
      loadStorage();
    }
  }, [isAuthenticated, currentPath]);

  useEffect(() => {
    if (searchQuery) {
      searchFiles(searchQuery);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/check");
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles() {
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(currentPath)}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      showToast("載入檔案失敗", "error");
    }
  }

  async function loadStorage() {
    try {
      const res = await fetch("/api/storage");
      const data = await res.json();
      setStorageInfo(data);
    } catch {
      // Ignore
    }
  }

  async function searchFiles(query: string) {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.files || []);
    } catch {
      showToast("搜尋失敗", "error");
    } finally {
      setIsSearching(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  }

  async function uploadFiles(filesToUpload: FileList) {
    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("parentPath", currentPath);

        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      showToast(`已上傳 ${successCount} 個檔案`, "success");
    }
    if (failCount > 0) {
      showToast(`${failCount} 個檔案上傳失敗`, "error");
    }
    loadFiles();
    loadStorage();
  }

  async function handleDelete(file: FileItem) {
    try {
      const res = await fetch(`/api/files/delete?id=${file.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("已刪除", "success");
        setDeleteFile(null);
        loadFiles();
        loadStorage();
      } else {
        throw new Error();
      }
    } catch {
      showToast("刪除失敗", "error");
    }
  }

  async function handleRename(file: FileItem, newName: string) {
    try {
      const res = await fetch("/api/files/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, newName }),
      });
      if (res.ok) {
        showToast("已重新命名", "success");
        setRenameFile(null);
        loadFiles();
        if (searchQuery) searchFiles(searchQuery);
      } else {
        throw new Error();
      }
    } catch {
      showToast("重新命名失敗", "error");
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/folders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parentPath: currentPath }),
      });
      if (res.ok) {
        showToast("已建立資料夾", "success");
        setShowNewFolderModal(false);
        setNewFolderName("");
        loadFiles();
      } else {
        throw new Error();
      }
    } catch {
      showToast("建立資料夾失敗", "error");
    }
  }

  function handleDownload(file: FileItem) {
    window.open(`/api/download?id=${file.id}`, "_blank");
  }

  async function handleBatchDownload() {
    if (selectedFiles.size === 0) return;
    const ids = Array.from(selectedFiles).join(",");
    window.open(`/api/download?multiple=true&ids=${ids}`, "_blank");
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    router.push("/login");
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFiles(newSelected);
  }

  function selectAll() {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSort(field: SortConfig["field"]) {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" }
    );
  }

  function sortedFiles(items: FileItem[]): FileItem[] {
    return [...items].sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      let cmp = 0;
      switch (sort.field) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "size": cmp = a.size - b.size; break;
        case "updatedAt": cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
      }
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }

  function getFileType(name: string, isFolder: boolean): string {
    if (isFolder) return "folder";
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"];
    const videoExts = ["mp4", "webm", "avi", "mov", "mkv", "flv", "wmv"];
    const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];
    const docExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
    const textExts = ["txt", "md", "json", "xml", "html", "css", "js", "ts", "py"];
    const archiveExts = ["zip", "rar", "7z", "tar", "gz"];
    if (imageExts.includes(ext)) return "image";
    if (videoExts.includes(ext)) return "video";
    if (audioExts.includes(ext)) return "audio";
    if (docExts.includes(ext)) return "document";
    if (textExts.includes(ext)) return "text";
    if (archiveExts.includes(ext)) return "archive";
    return "file";
  }

  function getFileIcon(type: string) {
    const icons: Record<string, { icon: React.ReactNode; color: string }> = {
      folder: { icon: <Folder className="w-5 h-5" />, color: "var(--accent)" },
      image: { icon: <Image className="w-5 h-5" />, color: "#22c55e" },
      video: { icon: <Video className="w-5 h-5" />, color: "#a855f7" },
      audio: { icon: <Music className="w-5 h-5" />, color: "#ec4899" },
      document: { icon: <FileText className="w-5 h-5" />, color: "#3b82f6" },
      text: { icon: <FileCode className="w-5 h-5" />, color: "#64748b" },
      archive: { icon: <Archive className="w-5 h-5" />, color: "#eab308" },
      file: { icon: <File className="w-5 h-5" />, color: "var(--text-muted)" },
    };
    return icons[type] || icons.file;
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  if (loading) {
    return (
      <>
        <div className="page-bg"><div className="orb orb-1"></div><div className="orb orb-2"></div><div className="orb orb-3"></div></div>
        <div className="loading-screen">
          <div className="loading-logo">📦</div>
          <div className="loading-dots">載入中</div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) return null;

  const pathParts = currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);

  return (
    <>
      <div className="page-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <button
        onClick={() => {
          const current = document.documentElement.getAttribute("data-theme");
          const next = current === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          localStorage.setItem("theme", next);
        }}
        className="theme-toggle"
        aria-label="切換深淺色模式"
      >
        <span className="icon-moon">🌙</span>
        <span className="icon-sun">☀️</span>
      </button>

      <div className="app-container">
        <header className="app-header">
          <div className="header-icon">📦</div>
          <h1>我的專屬雲盤</h1>
          <p>安全、私密、隨時隨地存取您的檔案</p>
        </header>

        <div className="glass-card card">
          <div className="card-title">
            <span>📤 上傳新檔案</span>
          </div>
          <div
            className={`upload-zone ${isDragging ? "dragover" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">⬆️</div>
            <p>把檔案<strong>拖曳</strong>到這裡，或<strong>點擊</strong>選擇檔案</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </div>

        <div className="glass-card card">
          <div className="card-title">
            <span>📂 檔案列表</span>
            {files.length > 0 && <span className="badge">{files.length} 個檔案</span>}
            {selectedFiles.size > 0 && (
              <span className="badge badge-selected">{selectedFiles.size} 已選擇</span>
            )}
          </div>

          <div className="toolbar">
            <div className="breadcrumb">
              <button onClick={() => { setCurrentPath("/"); setSearchQuery(""); }} className="breadcrumb-home">
                <HomeIcon />
              </button>
              {pathParts.map((part, i) => (
                <span key={i} className="breadcrumb-item">
                  <ChevronRight className="w-3 h-3" />
                  <button onClick={() => setCurrentPath("/" + pathParts.slice(0, i + 1).join("/"))}>{part}</button>
                </span>
              ))}
            </div>
            <div className="toolbar-actions">
              <button className="btn-secondary" onClick={() => setShowNewFolderModal(true)}>
                <FolderPlus className="w-4 h-4" />
                新增資料夾
              </button>
              {selectedFiles.size > 0 && (
                <button className="btn-primary" onClick={handleBatchDownload}>
                  <Download className="w-4 h-4" />
                  下載選擇
                </button>
              )}
            </div>
          </div>

          {searchQuery && (
            <div className="search-bar">
              <Search className="w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋檔案..."
              />
              <button onClick={() => setSearchQuery("")}><X className="w-4 h-4" /></button>
            </div>
          )}

          {isSearching ? (
            <div className="empty-state">
              <div className="loading-dots">搜尋中</div>
            </div>
          ) : searchQuery ? (
            searchResults.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>找不到相關檔案</p>
              </div>
            ) : (
              <div className="file-list">
                {searchResults.map((file) => {
                  const type = getFileType(file.name, file.isFolder);
                  const { icon, color } = getFileIcon(type);
                  return (
                    <div key={file.id} className="file-item" onClick={() => file.isFolder ? (setCurrentPath(file.path), setSearchQuery("")) : setPreviewFile(file)}>
                      <div className="file-info">
                        <div className="file-icon" style={{ background: `${color}20`, color }}>{icon}</div>
                        <div>
                          <div className="file-name">{file.name}</div>
                          <div className="file-meta">{file.isFolder ? "資料夾" : formatSize(file.size)} · {file.path}</div>
                        </div>
                      </div>
                      <div className="file-actions">
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="btn-icon" title="下載"><Download className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setRenameFile(file); }} className="btn-icon" title="重新命名"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteFile(file); }} className="btn-icon btn-icon-danger" title="刪除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暫無檔案，開始上傳吧</p>
            </div>
          ) : (
            <div className="file-list">
              {sortedFiles(files).map((file) => {
                const type = getFileType(file.name, file.isFolder);
                const { icon, color } = getFileIcon(type);
                const isSelected = selectedFiles.has(file.id);
                return (
                  <div key={file.id} className={`file-item ${isSelected ? "selected" : ""}`} onClick={() => file.isFolder ? setCurrentPath(file.path) : setPreviewFile(file)}>
                    <div className="file-checkbox">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(file.id)} onClick={(e) => e.stopPropagation()} />
                    </div>
                    <div className="file-info">
                      <div className="file-icon" style={{ background: `${color}20`, color }}>{icon}</div>
                      <div>
                        <div className="file-name">{file.name}</div>
                        <div className="file-meta">{file.isFolder ? "資料夾" : formatSize(file.size)} · {formatDate(file.updatedAt)}</div>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="btn-icon" title="下載"><Download className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setRenameFile(file); }} className="btn-icon" title="重新命名"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteFile(file); }} className="btn-icon btn-icon-danger" title="刪除"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card card storage-card">
          <div className="storage-info">
            <Cloud className="w-5 h-5" />
            <span>儲存空間</span>
            <span className="storage-used">{formatSize(storageInfo.used)} / {formatSize(storageInfo.limit)}</span>
          </div>
          <div className="storage-bar">
            <div className="storage-bar-fill" style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}></div>
          </div>
        </div>

        <button onClick={handleLogout} className="logout-btn">
          <LogOut className="w-4 h-4" />
          登出
        </button>
      </div>

      {/* Modals */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{previewFile.name}</h3>
              <button onClick={() => setPreviewFile(null)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <div className="modal-body">
              {previewFile.type === "image" ? (
                <div className="preview-loading">預覽載入中...</div>
              ) : (
                <div className="preview-placeholder">
                  <File className="w-12 h-12" />
                  <p>此檔案類型不支援線上預覽</p>
                  <button className="btn-primary" onClick={() => handleDownload(previewFile)}>
                    <Download className="w-4 h-4" />
                    下載檔案
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteFile && (
        <div className="modal-overlay" onClick={() => setDeleteFile(null)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>確認刪除</h3>
            </div>
            <div className="modal-body">
              <p>確定要刪除「{deleteFile.name}」嗎？{deleteFile.isFolder && "資料夾內的所有檔案也會被刪除。"}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteFile(null)}>取消</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteFile)}>刪除</button>
            </div>
          </div>
        </div>
      )}

      {renameFile && (
        <div className="modal-overlay" onClick={() => setRenameFile(null)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>重新命名</h3>
            </div>
            <div className="modal-body">
              <input
                type="text"
                defaultValue={renameFile.name}
                autoFocus
                className="input-field"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename(renameFile, (e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setRenameFile(null)}>取消</button>
              <button className="btn-primary" onClick={(e) => {
                const input = e.currentTarget.closest(".modal")?.querySelector("input");
                if (input) handleRename(renameFile, input.value);
              }}>確認</button>
            </div>
          </div>
        </div>
      )}

      {showNewFolderModal && (
        <div className="modal-overlay" onClick={() => setShowNewFolderModal(false)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增資料夾</h3>
            </div>
            <div className="modal-body">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="資料夾名稱"
                autoFocus
                className="input-field"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowNewFolderModal(false); setNewFolderName(""); }}>取消</button>
              <button className="btn-primary" onClick={handleCreateFolder}>建立</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.message}
        </div>
      )}

      <style jsx>{`
        .theme-toggle {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 100;
          width: 44px;
          height: 44px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .theme-toggle:hover { transform: scale(1.05); box-shadow: var(--shadow-md); }
        [data-theme="light"] .icon-sun { display: none; }
        [data-theme="dark"] .icon-moon { display: none; }

        .loading-screen {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .loading-logo {
          font-size: 48px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .loading-dots::after {
          content: '';
          animation: dots 1.5s steps(4, end) infinite;
        }
        @keyframes dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }

        .app-container {
          position: relative;
          z-index: 1;
          max-width: 880px;
          margin: 0 auto;
          padding: 72px 20px 40px;
          animation: fadeUp 0.5s ease;
        }

        .app-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .header-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
        }
        .app-header h1 {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin-bottom: 6px;
        }
        .app-header p {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .card {
          padding: 28px;
          margin-bottom: 20px;
        }
        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          background: var(--accent-soft);
          color: var(--accent);
        }
        .badge-selected {
          background: var(--accent);
          color: #fff;
        }

        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          background: var(--accent-soft);
          transition: all 0.25s;
        }
        .upload-zone:hover, .upload-zone.dragover {
          border-color: var(--accent);
          background: rgba(99, 102, 241, 0.18);
          transform: scale(1.005);
        }
        .upload-icon {
          width: 52px;
          height: 52px;
          margin: 0 auto 16px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .upload-zone p {
          color: var(--text-secondary);
          font-size: 15px;
        }
        .upload-zone strong {
          color: var(--accent);
          font-weight: 600;
        }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .breadcrumb-home {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 4px;
          display: flex;
          border-radius: 4px;
        }
        .breadcrumb-home:hover { background: var(--accent-soft); color: var(--accent); }
        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .breadcrumb-item button {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 4px 6px;
          border-radius: 4px;
        }
        .breadcrumb-item button:hover { background: var(--accent-soft); color: var(--accent); }
        .toolbar-actions {
          display: flex;
          gap: 8px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .search-bar input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 14px;
        }
        .search-bar input::placeholder { color: var(--text-muted); }
        .search-bar button {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 2px;
          display: flex;
        }
        .search-bar button:hover { color: var(--text-primary); }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .file-item:hover {
          border-color: var(--accent);
          box-shadow: var(--shadow-sm);
        }
        .file-item.selected {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .file-checkbox input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent);
        }
        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        .file-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .file-name {
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .file-meta {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .file-actions {
          display: flex;
          gap: 6px;
        }
        .btn-icon {
          width: 32px;
          height: 32px;
          border: none;
          background: var(--accent-soft);
          color: var(--accent);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .btn-icon:hover {
          background: var(--accent);
          color: #fff;
        }
        .btn-icon-danger {
          background: var(--danger-soft);
          color: var(--danger);
        }
        .btn-icon-danger:hover {
          background: var(--danger);
          color: #fff;
        }

        .empty-state {
          text-align: center;
          padding: 48px 20px;
          color: var(--text-muted);
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }
        .empty-state p {
          font-size: 15px;
        }

        .storage-card {
          padding: 20px 24px;
        }
        .storage-info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .storage-used {
          margin-left: auto;
          color: var(--text-secondary);
          font-weight: 400;
        }
        .storage-bar {
          height: 8px;
          background: var(--accent-soft);
          border-radius: 4px;
          overflow: hidden;
        }
        .storage-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), #8b5cf6);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background: var(--danger-soft);
          color: var(--danger);
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .logout-btn:hover {
          background: var(--danger);
          color: #fff;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        .modal {
          width: 100%;
          max-width: 420px;
          padding: 24px;
          animation: fadeUp 0.3s ease;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .modal-header h3 {
          font-size: 18px;
          font-weight: 700;
        }
        .modal-body {
          margin-bottom: 24px;
        }
        .modal-body p {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.6;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .input-field {
          width: 100%;
          padding: 12px 14px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: var(--accent);
        }

        .preview-loading {
          text-align: center;
          padding: 48px;
          color: var(--text-muted);
        }
        .preview-placeholder {
          text-align: center;
          padding: 48px;
          color: var(--text-muted);
        }
        .preview-placeholder p {
          margin: 16px 0;
        }

        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          animation: fadeUp 0.3s ease;
          box-shadow: var(--shadow-lg);
        }
        .toast-success {
          background: #22c55e;
          color: #fff;
        }
        .toast-error {
          background: var(--danger);
          color: #fff;
        }

        @media (max-width: 640px) {
          .app-container {
            padding: 64px 16px 32px;
          }
          .app-header h1 { font-size: 22px; }
          .card { padding: 20px; }
          .upload-zone { padding: 36px 16px; }
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .toolbar-actions {
            justify-content: flex-end;
          }
          .file-item {
            flex-wrap: wrap;
          }
          .file-actions {
            width: 100%;
            justify-content: flex-end;
            padding-top: 8px;
            border-top: 1px solid var(--border);
            margin-top: 8px;
          }
        }
      `}</style>
    </>
  );
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
