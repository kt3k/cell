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
function pub(type, data) {
  document.querySelectorAll(`.sub\\:${type}`).forEach((el) => {
    el.dispatchEvent(
      new CustomEvent(type, { bubbles: false, detail: data })
    );
  });
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
      el.classList.add(name);
      el.classList.add(initClass);
      el.addEventListener(`__unmount__:${name}`, () => {
        el.classList.remove(initClass);
      }, { once: true });
      const on = new Proxy(() => {
      }, {
        // simple event handler (like on.click = (e) => {})
        set(_, type, value) {
          addEventListener(name, el, type, value);
          return true;
        },
        get(_, outside) {
          if (outside === "outside") {
            return new Proxy({}, {
              set(_2, type, value) {
                assert(
                  typeof value === "function",
                  `Event handler must be a function, ${typeof value} (${value}) is given`
                );
                const listener = (e) => {
                  if (el !== e.target && !el.contains(e.target)) {
                    logEvent({
                      module: "outside",
                      color: "#39cccc",
                      e,
                      component: name
                    });
                    value(e);
                  }
                };
                document.addEventListener(type, listener);
                el.addEventListener(`__unmount__:${name}`, () => {
                  document.removeEventListener(type, listener);
                }, { once: true });
                return true;
              }
            });
          }
          return null;
        },
        // event delegation handler (like on(".button").click = (e) => {}))
        apply(_target, _thisArg, args) {
          const arg0 = args[0];
          if (typeof arg0 === "string") {
            return new Proxy({}, {
              set(_, type, value) {
                addEventListener(
                  name,
                  el,
                  type,
                  // deno-lint-ignore no-explicit-any
                  value,
                  arg0,
                  args[1]
                );
                return true;
              }
            });
          } else if (arg0 && typeof arg0 === "object") {
            return new Proxy({}, {
              set(_, type, value) {
                addEventListener(
                  name,
                  el,
                  type,
                  // deno-lint-ignore no-explicit-any
                  value,
                  void 0,
                  arg0
                );
                return true;
              }
            });
          }
          throw new Error(`Invalid on(...) call: ${typeof arg0} is given.`);
        }
      });
      const sub = (type) => el.classList.add(`sub:${type}`);
      const context = {
        el,
        on,
        pub,
        sub,
        query: (s) => el.querySelector(s),
        queryAll: (s) => el.querySelectorAll(s)
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
function addEventListener(name, el, type, handler, selector, options) {
  assert(
    typeof handler === "function",
    `Event handler must be a function, ${typeof handler} (${handler}) is given`
  );
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
  mount,
  pub,
  register,
  unmount
};
/*! Cell v0.1.9 | Copyright 2024 Yoshiya Hinosawa and Capsule contributors | MIT license */
