/**
 * Application event bus — the typed decoupling layer between feature modules.
 *
 * Two language features are central to its design:
 *
 *  - **Lexical scoping**: {@link createBus} stores its subscriber registry in
 *    the factory's lexical scope. The registry is unreachable from outside —
 *    callers only ever touch it through `on` / `once` / `emit` / `has`, and
 *    two buses created from the same factory share no state whatsoever. The
 *    type system reinforces the enclosure: no public member exposes the
 *    registry's type.
 *  - **Promises**: `emit()` returns a `Promise` that settles once every
 *    handler has finished (async handlers included), and `once()` returns a
 *    `Promise` that resolves with the next payload for a topic — or rejects
 *    after a caller-supplied timeout.
 *
 * Handler failures are caught and logged, mirroring the defensive boot in
 * `main.ts`: one broken subscriber never takes the rest of the page down.
 */

/** Every topic the application publishes, with its exact payload type. */
export interface EventMap {
  "app:ready": { modules: string[]; failed: string[]; at: number };
  "nav:toggle": { open: boolean };
  "theme:change": { theme: "light" | "dark"; previous: string | null };
  "tabs:change": { id: string; panel: string | null };
  "accordion:change": { id: string; expanded: boolean };
  "carousel:change": { atStart: boolean; atEnd: boolean };
  "calculator:restore": unknown;
  "calculator:change": { service: string; total: number };
  "form:submit": { outcome: "valid" | "invalid" | "ignored"; errors?: Record<string, string> };
  "trip:share": { ok: boolean; via: "clipboard" | "fallback" };
}

export type Topic = keyof EventMap & string;

/** Unsubscribe handle returned by `on()` — call it to remove one listener. */
export type Unsubscribe = () => void;

export interface Bus<E extends object = EventMap> {
  on<K extends keyof E & string>(topic: K, handler: (payload: E[K]) => void): Unsubscribe;
  once<K extends keyof E & string>(topic: K, timeoutMs?: number): Promise<E[K]>;
  emit<K extends keyof E & string>(topic: K, payload: E[K]): Promise<E[K]>;
  has(topic: keyof E & string): boolean;
  clear(): void;
}

/**
 * Builds an isolated bus instance.
 *
 * `topics` lives in this function's lexical scope, so it is a genuine
 * private field: no caller can enumerate, replace or leak the registry.
 *
 * The generic parameter defaults to the application's {@link EventMap}, so
 * the shared bus type-checks every publish/subscribe; tests (and any future
 * ad-hoc channel) can instantiate a loosely typed bus instead.
 */
export function createBus<E extends object = EventMap>(): Bus<E> {
  /** Private subscriber registry — unreachable from outside this closure. */
  const topics: { [K in keyof E & string]?: Array<(payload: E[K]) => void> } = {};

  function on<K extends keyof E & string>(topic: K, handler: (payload: E[K]) => void): Unsubscribe {
    if (typeof handler !== "function") {
      throw new TypeError(`bus.on: handler for "${topic}" must be a function`);
    }

    const listeners = topics[topic] ?? [];
    listeners.push(handler);
    topics[topic] = listeners;

    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      const index = listeners.indexOf(handler);
      if (index !== -1) listeners.splice(index, 1);
      if (!listeners.length) delete topics[topic];
    };
  }

  /** Waits for the next occurrence of a topic. Rejects on timeout. */
  function once<K extends keyof E & string>(topic: K, timeoutMs?: number): Promise<E[K]> {
    return new Promise<E[K]>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;

      const unsubscribe = on(topic, (payload) => {
        if (timer !== null) clearTimeout(timer);
        unsubscribe();
        resolve(payload);
      });

      if (typeof timeoutMs === "number" && timeoutMs > 0) {
        timer = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timed out after ${timeoutMs}ms waiting for "${topic}"`));
        }, timeoutMs);
      }
    });
  }

  /**
   * Publishes a payload to every subscriber of a topic.
   * Resolves once every handler has settled — handler errors are logged and
   * skipped instead of rejecting, so one faulty subscriber cannot block the
   * others. The payload is echoed back to the emitter.
   */
  function emit<K extends keyof E & string>(topic: K, payload: E[K]): Promise<E[K]> {
    const listeners = topics[topic] ? [...(topics[topic] ?? [])] : [];

    return Promise.all(
      listeners.map((handler) =>
        Promise.resolve()
          .then(() => handler(payload))
          .catch((error: unknown) => {
            console.error(`[tapsi] bus handler for "${topic}" failed`, error);
            return undefined;
          })
      )
    ).then(() => payload);
  }

  function has(topic: keyof E & string): boolean {
    return Boolean(topics[topic]?.length);
  }

  /** Drops every subscriber (used by tests and hot-reload paths). */
  function clear(): void {
    (Object.keys(topics) as Array<keyof E & string>).forEach((topic) => {
      delete topics[topic];
    });
  }

  return { on, once, emit, has, clear };
}

/** The application-wide singleton bus, fully typed against {@link EventMap}. */
export const bus: Bus<EventMap> = createBus<EventMap>();
