/*! Cell v0.3.2 | Copyright 2024 Yoshiya Hinosawa and Capsule contributors | MIT license */
import { documentReady, logEvent } from "./util.ts"
export { signal } from "@kt3k/signal"

interface Initializer {
  // deno-lint-ignore no-explicit-any
  (el: any): void
  /** The elector for the component */
  sel: string
}
interface RegistryType {
  [key: string]: Initializer
}

/**
 * The context of the component. This context is passed as the first argument to the component function for each mount.
 *
 * @typeParam EL The element type of the component
 */
export interface Context<EL = HTMLElement> {
  /** The element */
  el: EL
  /** Registers the event listener */
  on(type: string, handler: EventHandler): void
  /** Registers the event listener */
  on(type: string, selector: string, handler: EventHandler): void
  /** Registers the event listener */
  on(
    type: string,
    options: AddEventListenerOptions,
    handler: EventHandler,
  ): void
  /** Registers the event listener */
  on(
    type: string,
    selector: string,
    options: AddEventListenerOptions,
    handler: EventHandler,
  ): void
  /** Registers the event listener for the outside of the element */
  onOutside(type: string, handler: EventHandler): void
  /** Queries elements by the given selector under the component dom */
  query<T extends HTMLElement = HTMLElement>(selector: string): T | null
  /** Queries all elements by the given selector under the component dom */
  queryAll<T extends HTMLElement = HTMLElement>(
    selector: string,
  ): NodeListOf<T>
}

/** The component type */
export type Component<EL extends HTMLElement> = (
  ctx: Context<EL>,
) => string | undefined | void | PromiseLike<void | string>

/** The event handler type */
// deno-lint-ignore no-explicit-any
export type EventHandler = (e: any) => void

/** The registry of component initializers. */
const registry: RegistryType = {}

/**
 * Asserts the given condition holds, otherwise throws.
 * @param assertion The assertion expression
 * @param message The assertion message
 */
function assert(assertion: boolean, message: string): void {
  if (!assertion) {
    throw new Error(message)
  }
}

/**
 * Asserts the given name is a valid component name.
 * @param name The component name
 */
function assertComponentNameIsValid(name: unknown): void {
  assert(typeof name === "string", "The name should be a string")
  assert(
    !!registry[name as string],
    `The component of the given name is not registered: ${name}`,
  )
}

/**
 * Register the component with the given name
 *
 * @example Usage
 * ```ts
 * import { register } from "@kt3k/cell";
 *
 * function Component({ on }) {
 *   on.click = (e) => {
 *     console.log("clicked");
 *   };
 * }
 *
 * register(Component, "my-component");
 * ```
 *
 * @param component The component function
 * @param name The component name
 */
export function register<EL extends HTMLElement>(
  component: Component<EL>,
  name: string,
) {
  assert(
    typeof name === "string" && !!name,
    "Component name must be a non-empty string",
  )
  assert(
    !registry[name],
    `The component of the given name is already registered: ${name}`,
  )

  const initClass = `${name}-💊`

  /** Initializes the html element by the given configuration. */
  const initializer = (el: EL) => {
    if (!el.classList.contains(initClass)) {
      // FIXME(kt3k): the below can be written as .add(name, initClass)
      // when deno_dom fixes add class.
      el.classList.add(name)
      el.classList.add(initClass)
      el.addEventListener(`__unmount__:${name}`, () => {
        el.classList.remove(initClass)
      }, { once: true })

      const on = (
        type: string,
        // deno-lint-ignore no-explicit-any
        selector: any,
        // deno-lint-ignore no-explicit-any
        options?: any,
        // deno-lint-ignore no-explicit-any
        handler?: (e: any) => void,
      ) => {
        // normailize arguments
        if (typeof selector === "function") {
          handler = selector
          selector = undefined
          options = undefined
        } else if (
          typeof options === "function" && typeof selector === "string"
        ) {
          handler = options
          options = undefined
        } else if (
          typeof options === "function" && typeof selector === "object"
        ) {
          handler = options
          options = selector
          selector = undefined
        }

        if (typeof handler !== "function") {
          throw new Error(
            `Cannot add event listener: The handler must be a function, but ${typeof handler} is given`,
          )
        }

        addEventListener(name, el, type, handler, selector, options)
      }

      // deno-lint-ignore no-explicit-any
      const onOutside = (type: string, handler: (e: any) => void) => {
        assertEventType(type)
        assertEventHandler(handler)
        const listener = (e: Event) => {
          // deno-lint-ignore no-explicit-any
          if (el !== e.target && !el.contains(e.target as any)) {
            logEvent({
              module: "outside",
              color: "#39cccc",
              e,
              component: name,
            })
            handler(e)
          }
        }
        document.addEventListener(type, listener)
        el.addEventListener(`__unmount__:${name}`, () => {
          document.removeEventListener(type, listener)
        }, { once: true })
      }

      const context = {
        el,
        on,
        onOutside,
        query: <T extends HTMLElement = HTMLElement>(s: string) =>
          el.querySelector(s) as T | null,
        queryAll: <T extends HTMLElement = HTMLElement>(s: string) =>
          el.querySelectorAll(s) as NodeListOf<T>,
      }
      const html = component(context)
      if (typeof html === "string") {
        el.innerHTML = html
      } else if (html && typeof html.then === "function") {
        html.then((html) => {
          if (typeof html === "string") {
            el.innerHTML = html
          }
        })
      }
    }
  }

  // The selector
  initializer.sel = `.${name}:not(.${initClass})`

  registry[name] = initializer

  if (document.readyState === "complete") {
    mount()
  } else {
    documentReady().then(() => {
      mount(name)
    })
  }
}

function assertEventHandler(handler: unknown): asserts handler is EventHandler {
  assert(
    typeof handler === "function",
    `Cannot add an event listener: The event handler must be a function, ${typeof handler} (${handler}) is given`,
  )
}

function assertEventType(type: unknown): asserts type is string {
  assert(
    typeof type === "string",
    `Cannot add an event listener: The event type must be a string, ${typeof type} (${type}) is given`,
  )
}

function addEventListener(
  name: string,
  el: HTMLElement,
  type: string,
  handler: (e: Event) => void,
  selector?: string,
  options?: AddEventListenerOptions,
) {
  assertEventType(type)
  assertEventHandler(handler)

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
      })
      handler(e)
    }
  }
  el.addEventListener(`__unmount__:${name}`, () => {
    el.removeEventListener(type, listener, options)
  }, { once: true })
  el.addEventListener(type, listener, options)
}

/**
 * Mount the components to the doms.
 *
 * @example Usage
 * ```ts
 * import { mount } from "@kt3k/cell";
 *
 * mount();
 * ```
 *
 * @param name The component name to mount. If not given, all components are mounted.
 * @param el The elements of the children of this element will be initialied. If not given, the whole document is used.
 */
export function mount(name?: string | null, el?: HTMLElement) {
  let classNames: string[]

  if (!name) {
    classNames = Object.keys(registry)
  } else {
    assertComponentNameIsValid(name)

    classNames = [name]
  }

  classNames.map((className) => {
    ;[].map.call(
      (el || document).querySelectorAll(registry[className].sel),
      registry[className],
    )
  })
}

/**
 * Unmount the component from the dom.
 *
 * @example Usage
 * ```ts
 * import { unmount } from "@kt3k/cell";
 *
 * unmount("my-component", document.querySelector(".my-component"));
 * ```
 *
 * @param name The component name to unmount.
 * @param el The element of the component to unmount.
 */
export function unmount(name: string, el: HTMLElement) {
  assert(
    !!registry[name],
    `The component of the given name is not registered: ${name}`,
  )
  el.dispatchEvent(new CustomEvent(`__unmount__:${name}`))
}
