/**
 * Multi-Tab Synchronization Service.
 *
 * Utilizes the native modern `BroadcastChannel` API (with graceful fallback
 * to localStorage storage event) to synchronize application state (e.g. active theme,
 * trip calculations) across multiple open tabs in real-time.
 */

export interface SyncMessage<T = unknown> {
  type: string;
  payload: T;
  sourceTabId: string;
  timestamp: number;
}

export type SyncHandler<T = unknown> = (payload: T) => void;

export class CrossTabSyncService {
  private readonly channelName: string;
  private channel: BroadcastChannel | null = null;
  private readonly tabId: string;
  private readonly handlers = new Map<string, Set<SyncHandler>>();

  constructor(channelName: string = "tapsi_sync_channel") {
    this.channelName = channelName;
    this.tabId = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    this.init();
  }

  private init(): void {
    if (typeof window === "undefined") return;
    const win = window as Window;

    if ("BroadcastChannel" in win) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          this.handleIncoming(event.data);
        };
      } catch (err) {
        console.warn("[CrossTabSync] BroadcastChannel failed, using window fallback", err);
      }
    } else {
      win.addEventListener("storage", (event: StorageEvent) => {
        if (event.key === `sync:${this.channelName}` && event.newValue) {
          try {
            const data = JSON.parse(event.newValue) as SyncMessage;
            this.handleIncoming(data);
          } catch {
            // ignore JSON error
          }
        }
      });
    }
  }

  private handleIncoming(message: SyncMessage): void {
    if (!message || message.sourceTabId === this.tabId) return;
    const topicHandlers = this.handlers.get(message.type);
    if (topicHandlers) {
      topicHandlers.forEach((handler) => {
        try {
          handler(message.payload);
        } catch (err) {
          console.error(`[CrossTabSync] Handler failed for ${message.type}`, err);
        }
      });
    }
  }

  publish<T>(type: string, payload: T): void {
    const message: SyncMessage<T> = {
      type,
      payload,
      sourceTabId: this.tabId,
      timestamp: Date.now()
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch {
        // channel closed or detached
      }
    } else if (typeof window !== "undefined" && "localStorage" in window) {
      try {
        window.localStorage.setItem(`sync:${this.channelName}`, JSON.stringify(message));
      } catch {
        // ignore storage quota error
      }
    }
  }

  subscribe<T>(type: string, handler: SyncHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const set = this.handlers.get(type)!;
    set.add(handler as SyncHandler);

    return () => {
      set.delete(handler as SyncHandler);
      if (set.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.handlers.clear();
  }
}

export const crossTabSync = new CrossTabSyncService();
