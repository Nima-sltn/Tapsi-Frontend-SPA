/**
 * Robust Storage Repository with in-memory fallback, prefix namespacing,
 * schema validation, and storage availability detection.
 *
 * Protects the application against Incognito/Private mode storage blocks,
 * quota exceed errors, and invalid JSON corruptions.
 */

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStorageAdapter implements StorageAdapter {
  private readonly memory = new Map<string, string>();

  getItem(key: string): string | null {
    return this.memory.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.memory.set(key, value);
  }

  removeItem(key: string): void {
    this.memory.delete(key);
  }
}

export class StorageRepository {
  private readonly adapter: StorageAdapter;
  private readonly prefix: string;

  constructor(prefix: string = "tapsi:", customAdapter?: StorageAdapter) {
    this.prefix = prefix;
    if (customAdapter) {
      this.adapter = customAdapter;
    } else {
      this.adapter = this.detectOptimalStorage();
    }
  }

  private detectOptimalStorage(): StorageAdapter {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return new MemoryStorageAdapter();
    }
    try {
      const testKey = `__tapsi_test_${Date.now()}`;
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch {
      return new MemoryStorageAdapter();
    }
  }

  private formatKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  get<T>(key: string, validator?: (val: unknown) => val is T): T | null {
    try {
      const raw = this.adapter.getItem(this.formatKey(key));
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        this.remove(key);
        return null;
      }
      return parsed as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      this.adapter.setItem(this.formatKey(key), serialized);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      this.adapter.removeItem(this.formatKey(key));
    } catch {
      // Ignore cleanup error
    }
  }
}

export const defaultStorage = new StorageRepository();
