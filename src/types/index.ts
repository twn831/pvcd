export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  isFolder: boolean;
  parentPath: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageInfo {
  used: number;
  limit: number;
  percentage: number;
}

export interface SortConfig {
  field: "name" | "size" | "updatedAt";
  direction: "asc" | "desc";
}

export interface SearchResult {
  files: FileItem[];
  query: string;
}
