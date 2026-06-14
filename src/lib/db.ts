import { generateId, normalizePath, joinPath } from "./utils";
import { FileItem } from "@/types";

// D1 Prepared Statement type
interface D1Statement {
  bind(...params: unknown[]): {
    all(): Promise<{ results: unknown[] }>;
    run(): Promise<{ success: boolean }>;
    first(): Promise<unknown>;
  };
}

// D1 Database type
interface D1Database {
  prepare(sql: string): D1Statement;
}

let db: D1Database | null = null;

export function initDb(database: D1Database): void {
  db = database;
}

function getDb(): D1Database {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export async function initSchema(): Promise<void> {
  const database = getDb();
  await database.prepare(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL,
      type TEXT NOT NULL,
      is_folder INTEGER DEFAULT 0,
      parent_path TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).bind().run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)
  `).bind().run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_path)
  `).bind().run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_files_name ON files(name)
  `).bind().run();
}

export async function listFiles(parentPath: string): Promise<FileItem[]> {
  const normalizedParent = normalizePath(parentPath);
  const result = await getDb()
    .prepare("SELECT * FROM files WHERE parent_path = ? ORDER BY is_folder DESC, name ASC")
    .bind(normalizedParent)
    .all();

  return (result.results as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      path: r.path as string,
      size: r.size as number,
      type: r.type as string,
      isFolder: Boolean(r.is_folder),
      parentPath: r.parent_path as string,
      createdBy: r.created_by as string | undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  });
}

export async function getFileById(id: string): Promise<FileItem | null> {
  const result = await getDb()
    .prepare("SELECT * FROM files WHERE id = ?")
    .bind(id)
    .first();

  if (!result) return null;
  const r = result as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    path: r.path as string,
    size: r.size as number,
    type: r.type as string,
    isFolder: Boolean(r.is_folder),
    parentPath: r.parent_path as string,
    createdBy: r.created_by as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function createFile(
  name: string,
  parentPath: string,
  size: number,
  type: string,
  createdBy?: string
): Promise<FileItem> {
  const id = generateId();
  const normalizedParent = normalizePath(parentPath);
  const path = joinPath(normalizedParent, name);
  const now = new Date().toISOString();

  await getDb()
    .prepare(`
      INSERT INTO files (id, name, path, size, type, is_folder, parent_path, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `)
    .bind(id, name, path, size, type, normalizedParent, createdBy || null, now, now)
    .run();

  return {
    id,
    name,
    path,
    size,
    type,
    isFolder: false,
    parentPath: normalizedParent,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export async function createFolder(
  name: string,
  parentPath: string,
  createdBy?: string
): Promise<FileItem> {
  const id = generateId();
  const normalizedParent = normalizePath(parentPath);
  const path = joinPath(normalizedParent, name);
  const now = new Date().toISOString();

  await getDb()
    .prepare(`
      INSERT INTO files (id, name, path, size, type, is_folder, parent_path, created_by, created_at, updated_at)
      VALUES (?, ?, ?, 0, 'folder', 1, ?, ?, ?, ?)
    `)
    .bind(id, name, path, normalizedParent, createdBy || null, now, now)
    .run();

  return {
    id,
    name,
    path,
    size: 0,
    type: "folder",
    isFolder: true,
    parentPath: normalizedParent,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteFileById(id: string): Promise<void> {
  await getDb()
    .prepare("DELETE FROM files WHERE id = ?")
    .bind(id)
    .run();
}

export async function deleteFolderAndContents(path: string): Promise<string[]> {
  const normalizedPath = normalizePath(path);
  const pathsToDelete: string[] = [];

  async function collectPaths(currentPath: string): Promise<void> {
    const files = await listFiles(currentPath);
    for (const file of files) {
      pathsToDelete.push(file.path);
      if (file.isFolder) {
        await collectPaths(file.path);
      }
    }
  }

  await collectPaths(normalizedPath);
  pathsToDelete.push(normalizedPath);

  for (const p of pathsToDelete) {
    await getDb()
      .prepare("DELETE FROM files WHERE path = ? OR parent_path = ?")
      .bind(p, p)
      .run();
  }

  return pathsToDelete;
}

export async function renameFile(id: string, newName: string): Promise<FileItem | null> {
  const file = await getFileById(id);
  if (!file) return null;

  const now = new Date().toISOString();
  const newPath = joinPath(file.parentPath, newName);

  if (file.isFolder) {
    await getDb()
      .prepare(`
        UPDATE files SET name = ?, path = ?, updated_at = ? WHERE id = ?
      `)
      .bind(newName, newPath, now, id)
      .run();

    const allFiles = await getAllDescendants(file.path);
    for (const f of allFiles) {
      const updatedChildPath = f.path.replace(file.path, newPath);
      await getDb()
        .prepare(`
          UPDATE files SET path = ?, parent_path = ?, updated_at = ? WHERE id = ?
        `)
        .bind(updatedChildPath, newPath, now, f.id)
        .run();
    }
  } else {
    await getDb()
      .prepare(`
        UPDATE files SET name = ?, path = ?, updated_at = ? WHERE id = ?
      `)
      .bind(newName, newPath, now, id)
      .run();
  }

  return { ...file, name: newName, path: newPath, updatedAt: now };
}

async function getAllDescendants(path: string): Promise<FileItem[]> {
  const result = await getDb()
    .prepare("SELECT * FROM files WHERE path LIKE ?")
    .bind(`${path}/%`)
    .all();

  return (result.results as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      path: r.path as string,
      size: r.size as number,
      type: r.type as string,
      isFolder: Boolean(r.is_folder),
      parentPath: r.parent_path as string,
      createdBy: r.created_by as string | undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  });
}

export async function searchFiles(query: string): Promise<FileItem[]> {
  const searchPattern = `%${query}%`;
  const result = await getDb()
    .prepare(`
      SELECT * FROM files
      WHERE name LIKE ? COLLATE NOCASE
      ORDER BY is_folder DESC, name ASC
    `)
    .bind(searchPattern)
    .all();

  return (result.results as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      path: r.path as string,
      size: r.size as number,
      type: r.type as string,
      isFolder: Boolean(r.is_folder),
      parentPath: r.parent_path as string,
      createdBy: r.created_by as string | undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  });
}

export async function getStorageUsed(): Promise<number> {
  const result = await getDb()
    .prepare("SELECT SUM(size) as total FROM files WHERE is_folder = 0")
    .bind()
    .first();

  const r = result as Record<string, unknown> | undefined;
  return (r?.total as number) || 0;
}

export async function getAllFiles(): Promise<FileItem[]> {
  const result = await getDb()
    .prepare("SELECT * FROM files")
    .bind()
    .all();

  return (result.results as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      path: r.path as string,
      size: r.size as number,
      type: r.type as string,
      isFolder: Boolean(r.is_folder),
      parentPath: r.parent_path as string,
      createdBy: r.created_by as string | undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  });
}
