// Copyright 2024 Yoshiya Hinosawa. All rights reserved. MIT license.

type Handler<T = unknown> = (event: T) => void;

/**
 * Signal class.
 *
 * @experimental
 */
export class Signal<T> {
  #val: T;
  #handlers: Handler<T>[] = [];
  constructor(value: T) {
    this.#val = value;
  }

  /**
   * Get the current value of the signal.
   *
   * @returns The current value of the signal
   */
  get(): T {
    return this.#val;
  }

  /**
   * Update the signal value.
   *
   * @param value The new value of the signal
   */
  update(value: T) {
    if (this.#val !== value) {
      this.#val = value;
      this.#handlers.forEach((handler) => {
        handler(value);
      });
    }
  }

  /**
   * Update the signal value by comparing the fields of the new value.
   *
   * @param value The new value of the signal
   */
  updateByFields(value: T) {
    if (typeof value !== "object" || value === null) {
      throw new Error("value must be an object");
    }
    for (const key of Object.keys(value)) {
      // deno-lint-ignore no-explicit-any
      if ((this.#val as any)[key] !== (value as any)[key]) {
        this.#val = { ...value };
        this.#handlers.forEach((handler) => {
          handler(this.#val);
        });
        break;
      }
    }
  }

  /**
   * Subscribe to the signal.
   *
   * @param cb The callback function to be called when the signal is updated
   * @returns A function to stop the subscription
   */
  onChange(cb: (val: T) => void): () => void {
    this.#handlers.push(cb);
    return () => {
      this.#handlers.splice(this.#handlers.indexOf(cb) >>> 0, 1);
    };
  }
}

/**
 * A signal is a value that can be updated and listened to.
 *
 * @example Usage
 * ```ts
 * import { signal } from "@kt3k/signal";
 *
 * const a = signal(1);
 *
 * console.log(a.get()); // 1
 *
 * const stop = a.onChange((val) => {
 *   console.log(val);
 * });
 *
 * a.update(2); // 2
 *
 * stop();
 *
 * a.update(3); // No log
 * ```
 *
 * @typeParam T The type of the signal value
 * @param value The initial value of the signal
 * @returns {Signal<T>}
 *
 * @experimental
 */
export function signal<T>(value: T): Signal<T> {
  return new Signal(value);
}
