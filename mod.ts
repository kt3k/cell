/*! Cell v0.1.0 | Copyright 2024 Yoshiya Hinosawa and Capsule contributors | MIT license */
import { documentReady, logEvent } from "./util.ts";

interface Initializer {
  (el: HTMLElement): void;
  /** The elector for the component */
  sel: string;
}
interface RegistryType {
  [key: string]: Initializer;
}
interface EventRegistry {
  outside: {
    [key: string]: EventHandler;
  };
  // deno-lint-ignore ban-types
  [key: string]: EventHandler | {};
  (selector: string): {
    [key: string]: EventHandler;
  };
}

export interface Context<EL = HTMLElement> {
  /** The element */
  el: EL;
  /** The event registry. You can register event listener on `el` easily with this helper. */
  on: EventRegistry;
  /** Publishes the event. Events are delivered to elements which have `sub:event` class.
   * The dispatched events don't bubbles up */
  pub<T = unknown>(event: string, data?: T): void;
  /** Add sub:event class to the component element */
  sub(event: string): void;
  /** Queries elements by the given selector under the component dom */
  query<T extends HTMLElement = HTMLElement>(selector: string): T | null;
  /** Queries all elements by the given selector under the component dom */
  queryAll<T extends HTMLElement = HTMLElement>(
    selector: string,
  ): NodeListOf<T>;
}

/** The component type */
export type Component = <T extends HTMLElement>(
  ctx: Context<T>,
) => string | undefined | void;

/** The event handler type */
export type EventHandler = (e: Event) => void;

/** The registry of component initializers. */
const registry: RegistryType = {};

/**
 * Asserts the given condition holds, otherwise throws.
 * @param assertion The assertion expression
 * @param message The assertion message
 */
function assert(assertion: boolean, message: string): void {
  if (!assertion) {
    throw new Error(message);
  }
}

/**
 * Asserts the given name is a valid component name.
 * @param name The component name
 */
function assertComponentNameIsValid(name: unknown): void {
  assert(typeof name === "string", "The name should be a string");
  assert(
    !!registry[name as string],
    `The component of the given name is not registered: ${name}`,
  );
}

type MountHook = (el: HTMLElement) => void;

/**
 * Register the component with the given name
 *
 * @param component The component function
 * @param name The component name
 */
export function register(component: Component, name: string) {
  assert(
    typeof name === "string" && !!name,
    "Component name must be a non-empty string",
  );
  assert(
    !registry[name],
    `The component of the given name is already registered: ${name}`,
  );

  const initClass = `${name}-💊`;

  /** Initializes the html element by the given configuration. */
  const initializer = (el: HTMLElement) => {
    if (!el.classList.contains(initClass)) {
      // FIXME(kt3k): the below can be written as .add(name, initClass)
      // when deno_dom fixes add class.
      el.classList.add(name);
      el.classList.add(initClass);
      el.addEventListener(`__ummount__:${name}`, () => {
        el.classList.remove(initClass);
      }, { once: true });

      // deno-lint-ignore no-explicit-any
      const on: any = new Proxy(() => {}, {
        // simple event handler (like on.click = (e) => {})
        set(_: unknown, type: string, value: unknown): boolean {
          // deno-lint-ignore no-explicit-any
          addEventListener(name, el, type, value as any);
          return true;
        },
        get(_: unknown, outside: string) {
          if (outside === "outside") {
            return new Proxy({}, {
              set(_: unknown, type: string, value: unknown): boolean {
                assert(
                  typeof value === "function",
                  `Event handler must be a function, ${typeof value} (${value}) is given`,
                );
                const listener = (e: Event) => {
                  // deno-lint-ignore no-explicit-any
                  if (el !== e.target && !el.contains(e.target as any)) {
                    logEvent({
                      module: "outside",
                      color: "#39cccc",
                      e,
                      component: name,
                    });
                    (value as EventHandler)(e);
                  }
                };
                document.addEventListener(type, listener);
                el.addEventListener(`__unmount__:${name}`, () => {
                  document.removeEventListener(type, listener);
                }, { once: true });
                return true;
              },
            });
          }
          return null;
        },
        // event delegation handler (like on(".button").click = (e) => {}))
        apply(_target, _thisArg, args) {
          const selector = args[0];
          assert(
            typeof selector === "string",
            "Delegation selector must be a string. ${typeof selector} is given.",
          );
          return new Proxy({}, {
            set(_: unknown, type: string, value: unknown): boolean {
              addEventListener(
                name,
                el,
                type,
                // deno-lint-ignore no-explicit-any
                value as any,
                selector,
              );
              return true;
            },
          });
        },
      });

      const pub = (type: string, data?: unknown) => {
        document.querySelectorAll(`.sub\\:${type}`).forEach((el) => {
          el.dispatchEvent(
            new CustomEvent(type, { bubbles: false, detail: data }),
          );
        });
      };
      const sub = (type: string) => el.classList.add(`sub:${type}`);

      const context = {
        el,
        on,
        pub,
        sub,
        query: <T extends HTMLElement = HTMLElement>(s: string) =>
          el.querySelector(s) as T | null,
        queryAll: <T extends HTMLElement = HTMLElement>(s: string) =>
          el.querySelectorAll(s) as NodeListOf<T>,
      };
      const html = component(context);
      if (typeof html === "string") {
        el.innerHTML = html;
      }
    }
  };

  // The selector
  initializer.sel = `.${name}:not(.${initClass})`;

  registry[name] = initializer;

  documentReady().then(() => {
    mount(name);
  });
}

function addEventListener(
  name: string,
  el: HTMLElement,
  type: string,
  handler: (e: Event) => void,
  selector?: string,
) {
  assert(
    typeof handler === "function",
    `Event handler must be a function, ${typeof handler} (${handler}) is given`,
  );

  const listener = (e: Event) => {
    if (
      !selector ||
      [].some.call(
        el.querySelectorAll(selector),
        (node: Node) => node === e.target || node.contains(e.target as Node),
      )
    ) {
      logEvent({
        module: "💊",
        color: "#e0407b",
        e,
        component: name,
      });
      handler(e);
    }
  };
  el.addEventListener(`__unmount__:${name}`, () => {
    el.removeEventListener(type, listener);
  }, { once: true });
  el.addEventListener(type, listener);
}

/**
 * Mount the components to the doms.
 *
 * @param name The component name to mount. If not given, all components are mounted.
 * @param el The elements of the children of this element will be initialied. If not given, the whole document is used.
 */
export function mount(name?: string | null, el?: HTMLElement) {
  let classNames: string[];

  if (!name) {
    classNames = Object.keys(registry);
  } else {
    assertComponentNameIsValid(name);

    classNames = [name];
  }

  classNames.map((className) => {
    [].map.call(
      (el || document).querySelectorAll(registry[className].sel),
      registry[className],
    );
  });
}

/**
 * Unmount the component from the dom.
 *
 * @param name The component name to unmount.
 * @param el The element of the component to unmount.
 */
export function unmount(name: string, el: HTMLElement) {
  assert(
    !!registry[name],
    `The component of the given name is not registered: ${name}`,
  );
  el.dispatchEvent(new CustomEvent(`__unmount__:${name}`));
}
