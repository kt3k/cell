// util.ts
var READY_STATE_CHANGE = "readystatechange";
var p;
function documentReady(doc = document) {
  p ??= new Promise((resolve) => {
    const checkReady = () => {
      if (doc.readyState === "complete") {
        resolve();
        doc.removeEventListener(READY_STATE_CHANGE, checkReady);
      }
    };
    doc.addEventListener(READY_STATE_CHANGE, checkReady);
    checkReady();
  });
  return p;
}
var boldColor = (color) => `color: ${color}; font-weight: bold;`;
var defaultEventColor = "#f012be";
function logEvent({
  component,
  e,
  module,
  color
}) {
  if (typeof __DEV__ === "boolean" && !__DEV__)
    return;
  const event = e.type;
  if (typeof DEBUG_IGNORE === "object" && DEBUG_IGNORE?.has(event))
    return;
  console.groupCollapsed(
    `${module}> %c${event}%c on %c${component}`,
    boldColor(color || defaultEventColor),
    "",
    boldColor("#1a80cc")
  );
  console.log(e);
  if (e.target) {
    console.log(e.target);
  }
  console.groupEnd();
}

// https://jsr.io/@kt3k/signal/0.3.0/mod.ts
var Signal = class _Signal {
  #val;
  #handlers = [];
  constructor(value) {
    this.#val = value;
  }
  /**
   * Get the current value of the signal.
   *
   * @returns The current value of the signal
   */
  get() {
    return this.#val;
  }
  /**
   * Update the signal value.
   *
   * @param value The new value of the signal
   */
  update(value) {
    if (this.#val !== value) {
      this.#val = value;
      this.#handlers.forEach((handler) => {
        handler(value);
      });
    }
  }
  /**
   * Subscribe to the signal.
   *
   * @param cb The callback function to be called when the signal is updated
   * @returns A function to stop the subscription
   */
  onChange(cb) {
    this.#handlers.push(cb);
    return () => {
      this.#handlers.splice(this.#handlers.indexOf(cb) >>> 0, 1);
    };
  }
  /**
   * Subscribe to the signal.
   *
   * @param cb The callback function to be called when the signal is updated and also called immediately
   * @returns A function to stop the subscription
   */
  subscribe(cb) {
    cb(this.#val);
    return this.onChange(cb);
  }
  /** Maps the signal to a different signal */
  map(fn) {
    const signal = new _Signal(fn(this.#val));
    this.onChange((val) => signal.update(fn(val)));
    return signal;
  }
};
var GroupSignal = class _GroupSignal {
  #val;
  #handlers = [];
  constructor(value) {
    this.#val = value;
  }
  /**
   * Get the current value of the signal.
   *
   * @returns The current value of the signal
   */
  get() {
    return this.#val;
  }
  /**
   * Update the signal value.
   * The signal event is only emitted when the fields of the new value are different from the current value.
   *
   * @param value The new value of the signal
   */
  update(value) {
    if (typeof value !== "object" || value === null) {
      throw new Error("value must be an object");
    }
    for (const key of Object.keys(value)) {
      if (this.#val[key] !== value[key]) {
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
  onChange(cb) {
    this.#handlers.push(cb);
    return () => {
      this.#handlers.splice(this.#handlers.indexOf(cb) >>> 0, 1);
    };
  }
  /**
   * Subscribe to the signal.
   *
   * @param cb The callback function to be called when the signal is updated and also called immediately
   * @returns A function to stop the subscription
   */
  subscribe(cb) {
    cb(this.#val);
    return this.onChange(cb);
  }
  /** Maps the signal to a different signal */
  map(fn) {
    const signal = new _GroupSignal(fn(this.#val));
    this.onChange((val) => signal.update(fn(val)));
    return signal;
  }
};

// mod.ts
var registry = {};
function assert(assertion, message) {
  if (!assertion) {
    throw new Error(message);
  }
}
function assertComponentNameIsValid(name) {
  assert(typeof name === "string", "The name should be a string");
  assert(
    !!registry[name],
    `The component of the given name is not registered: ${name}`
  );
}
function register(component, name) {
  assert(
    typeof name === "string" && !!name,
    "Component name must be a non-empty string"
  );
  assert(
    !registry[name],
    `The component of the given name is already registered: ${name}`
  );
  const initClass = `${name}-\u{1F48A}`;
  const initializer = (el) => {
    if (!el.classList.contains(initClass)) {
      const onUnmount = (handler) => {
        el.addEventListener(`__unmount__:${name}`, handler, { once: true });
      };
      el.classList.add(name);
      el.classList.add(initClass);
      onUnmount(() => el.classList.remove(initClass));
      const on = (type, selector, options, handler) => {
        if (typeof selector === "function") {
          handler = selector;
          selector = void 0;
          options = void 0;
        } else if (typeof options === "function" && typeof selector === "string") {
          handler = options;
          options = void 0;
        } else if (typeof options === "function" && typeof selector === "object") {
          handler = options;
          options = selector;
          selector = void 0;
        }
        if (typeof handler !== "function") {
          throw new Error(
            `Cannot add event listener: The handler must be a function, but ${typeof handler} is given`
          );
        }
        addEventListener(name, el, type, handler, selector, options);
      };
      const onOutside = (type, handler) => {
        assertEventType(type);
        assertEventHandler(handler);
        const listener = (e) => {
          if (el !== e.target && !el.contains(e.target)) {
            logEvent({
              module: "outside",
              color: "#39cccc",
              e,
              component: name
            });
            handler(e);
          }
        };
        document.addEventListener(type, listener);
        onUnmount(() => document.removeEventListener(type, listener));
      };
      const subscribe = (signal, handler) => {
        onUnmount(signal.subscribe(handler));
      };
      const context = {
        el,
        on,
        onOutside,
        onUnmount,
        query: (s) => el.querySelector(s),
        queryAll: (s) => el.querySelectorAll(s),
        subscribe
      };
      const html = component(context);
      if (typeof html === "string") {
        el.innerHTML = html;
      } else if (html && typeof html.then === "function") {
        html.then((html2) => {
          if (typeof html2 === "string") {
            el.innerHTML = html2;
          }
        });
      }
    }
  };
  initializer.sel = `.${name}:not(.${initClass})`;
  registry[name] = initializer;
  if (document.readyState === "complete") {
    mount();
  } else {
    documentReady().then(() => {
      mount(name);
    });
  }
}
function assertEventHandler(handler) {
  assert(
    typeof handler === "function",
    `Cannot add an event listener: The event handler must be a function, ${typeof handler} (${handler}) is given`
  );
}
function assertEventType(type) {
  assert(
    typeof type === "string",
    `Cannot add an event listener: The event type must be a string, ${typeof type} (${type}) is given`
  );
}
function addEventListener(name, el, type, handler, selector, options) {
  assertEventType(type);
  assertEventHandler(handler);
  const listener = (e) => {
    if (!selector || [].some.call(
      el.querySelectorAll(selector),
      (node) => node === e.target || node.contains(e.target)
    )) {
      logEvent({
        module: "\u{1F48A}",
        color: "#e0407b",
        e,
        component: name
      });
      handler(e);
    }
  };
  el.addEventListener(`__unmount__:${name}`, () => {
    el.removeEventListener(type, listener, options);
  }, { once: true });
  el.addEventListener(type, listener, options);
}
function mount(name, el) {
  let classNames;
  if (!name) {
    classNames = Object.keys(registry);
  } else {
    assertComponentNameIsValid(name);
    classNames = [name];
  }
  classNames.map((className) => {
    ;
    [].map.call(
      (el || document).querySelectorAll(registry[className].sel),
      registry[className]
    );
  });
}
function unmount(name, el) {
  assert(
    !!registry[name],
    `The component of the given name is not registered: ${name}`
  );
  el.dispatchEvent(new CustomEvent(`__unmount__:${name}`));
}
export {
  GroupSignal,
  Signal,
  mount,
  register,
  unmount
};
/*! Cell v0.7.5 | Copyright 2024 Yoshiya Hinosawa and Capsule contributors | MIT license */
