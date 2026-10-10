/**
 * Application event bus — the decoupling layer between feature modules.
 *
 * Two language features are central to its design:
 *
 *  - **Lexical scoping**: every bus owns its subscriber registry inside the
 *    {@link createBus} closure. The registry is unreachable from outside —
 *    callers can only touch it through `on` / `once` / `emit` / `has`, and
 *    two buses created from the same factory share no state whatsoever.
 *  - **Promises**: `emit()` returns a `Promise` that settles once every
 *    handler has finished (async handlers included), and `once()` returns a
 *    `Promise` that resolves with the next payload for a topic — or rejects
 *    after a caller-supplied timeout.
 *
 * Handler failures are caught and logged, mirroring the defensive boot in
 * `main.js`: one broken subscriber never takes the rest of the page down.
 *
 * @namespace Tapsi.bus
 */
(function (global) {
  "use strict";

  /**
   * Builds an isolated bus instance.
   *
   * `topics` lives in this function's lexical scope, so it is a genuine
   * private field: no caller can enumerate, replace or leak the registry.
   *
   * @returns {{on: Function, once: Function, emit: Function, has: Function, clear: Function}}
   */
  function createBus() {
    /** @type {Object<string, Function[]>} Private subscriber registry. */
    var topics = Object.create(null);

    /**
     * Subscribes to a topic.
     * @param {string} topic Event name.
     * @param {function(*): *} handler Called with the emitted payload.
     * @returns {function(): void} Idempotent unsubscribe function.
     * @throws {TypeError} When the handler is not a function.
     */
    function on(topic, handler) {
      if (typeof handler !== "function") {
        throw new TypeError('bus.on: handler for "' + topic + '" must be a function');
      }

      var listeners = topics[topic] || (topics[topic] = []);
      listeners.push(handler);

      var removed = false;
      return function unsubscribe() {
        if (removed) return;
        removed = true;
        var index = listeners.indexOf(handler);
        if (index !== -1) listeners.splice(index, 1);
        if (!listeners.length) delete topics[topic];
      };
    }

    /**
     * Waits for the next occurrence of a topic.
     * @param {string} topic Event name.
     * @param {number} [timeoutMs] Milliseconds before the promise rejects.
     * @returns {Promise<*>} Resolves with the first payload; rejects on timeout.
     */
    function once(topic, timeoutMs) {
      return new Promise(function (resolve, reject) {
        var timer = null;

        var unsubscribe = on(topic, function (payload) {
          if (timer !== null) global.clearTimeout(timer);
          unsubscribe();
          resolve(payload);
        });

        if (typeof timeoutMs === "number" && timeoutMs > 0) {
          timer = global.setTimeout(function () {
            unsubscribe();
            reject(new Error('Timed out after ' + timeoutMs + 'ms waiting for "' + topic + '"'));
          }, timeoutMs);
        }
      });
    }

    /**
     * Publishes a payload to every subscriber of a topic.
     * @param {string} topic Event name.
     * @param {*} [payload] Any value passed to the handlers.
     * @returns {Promise<*>} Resolves once every handler has settled —
     *   handler errors are logged and skipped instead of rejecting, so one
     *   faulty subscriber cannot block the others.
     */
    function emit(topic, payload) {
      var listeners = topics[topic] ? topics[topic].slice() : [];

      return Promise.all(
        listeners.map(function (handler) {
          return Promise.resolve()
            .then(function () {
              return handler(payload);
            })
            .catch(function (error) {
              if (global.console && console.error) {
                console.error('[tapsi] bus handler for "' + topic + '" failed', error);
              }
              return undefined;
            });
        })
      ).then(function () {
        return payload;
      });
    }

    /**
     * @param {string} topic Event name.
     * @returns {boolean} Whether the topic currently has subscribers.
     */
    function has(topic) {
      return Boolean(topics[topic] && topics[topic].length);
    }

    /** Drops every subscriber (used by tests and hot-reload paths). */
    function clear() {
      topics = Object.create(null);
    }

    return { on: on, once: once, emit: emit, has: has, clear: clear };
  }

  var api = createBus();
  api.createBus = createBus;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.Tapsi = global.Tapsi || {};
    global.Tapsi.bus = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
