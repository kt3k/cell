// Copyright 2022 Yoshiya Hinosawa. All rights reserved. MIT license.

import { assert, assertEquals, assertExists, assertThrows } from "@std/assert";
import "./dom_polyfill.ts";
import { type Context, mount, register, unmount } from "./mod.ts";

// disable debug logs because it's too verbose for unit testing
// deno-lint-ignore no-explicit-any
(globalThis as any).__DEV__ = false;

Deno.test("Component body is called when the component is mounted", () => {
  const name = randomName();

  document.body.innerHTML = `<div class="${name}"></div>`;

  let called = false;

  function Component() {
    called = true;
  }

  register(Component, name);
  assert(called);
});

Deno.test("sub() add sub:type class to the dom", () => {
  const name = randomName();

  document.body.innerHTML = `<div class="${name}"></div>`;
  const div = queryByClass(name);

  function Component({ el, sub }: Context) {
    el.classList.add("foo");
    sub("bar");
    return "<p>hello</p>";
  }

  register(Component, name);

  assert(div.classList.contains("foo"));
  assert(div.classList.contains("sub:bar"));
  assert(div.innerHTML === "<p>hello</p>");
});

/*
Deno.test("on.__unmount__ is called when the componet is unmounted", () => {
  const name = randomName();
  const { on } = component(name);

  document.body.innerHTML = `<div class="${name}"></div>`;

  let called = false;

  on.__unmount__ = () => {
    called = true;
  };

  mount();
  assert(!called);
  unmount(name, query(`.${name}`)!);
  assert(called);
});
*/

Deno.test("unmount removes the event listeners", () => {
  const name = randomName();

  document.body.innerHTML = `<div class="${name}"></div>`;
  const div = queryByClass(name);

  let count = 0;
  function Component({ on }: Context) {
    on["my-event"] = () => {
      count++;
    };
  }
  register(Component, name);

  assertEquals(count, 0);
  div.dispatchEvent(new CustomEvent("my-event"));
  assertEquals(count, 1);
  div.dispatchEvent(new CustomEvent("my-event"));
  assertEquals(count, 2);
  unmount(name, div!);
  div.dispatchEvent(new CustomEvent("my-event"));
  assertEquals(count, 2);
});

Deno.test("on[event] is called when the event is dispatched", () => {
  const name = randomName();

  document.body.innerHTML = `<div class="${name}"></div>`;
  const div = queryByClass(name);

  let called = false;
  function Component({ on }: Context) {
    on.click = () => {
      called = true;
    };
    on.click = () => {
      called = true;
    };
  }
  register(Component, name);

  div.dispatchEvent(new Event("click"));
  assert(called);
});

Deno.test("on(selector)[event] is called when the event is dispatched only under the selector", async () => {
  const name = randomName();

  document.body.innerHTML =
    `<div class="${name}"><button class="btn1"></button><button class="btn2"></button></div>`;

  let onBtn1ClickCalled = false;
  let onBtn2ClickCalled = false;

  function Component({ on }: Context) {
    on(".btn1").click = () => {
      onBtn1ClickCalled = true;
    };

    on(".btn2").click = () => {
      onBtn2ClickCalled = true;
    };
  }
  register(Component, name);

  const btn = queryByClass("btn1");
  // FIXME(kt3k): workaround for deno_dom & deno issue
  // deno_dom doesn't bubble event when the direct target dom doesn't have event handler
  btn.addEventListener("click", () => {});
  btn.dispatchEvent(new Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));

  assert(onBtn1ClickCalled);
  assert(!onBtn2ClickCalled);
});

Deno.test("on.outside.event works", () => {
  const name = randomName();

  document.body.innerHTML =
    `<div class="root"><div class="${name}"></div><div class="sibling"></div></div>`;

  let calledCount = 0;
  function Component({ on }: Context) {
    on.outside.click = () => {
      calledCount++;
    };
  }
  register(Component, name);

  assertEquals(calledCount, 0);

  const sibling = queryByClass("sibling")!;
  // FIXME(kt3k): workaround for deno_dom & deno issue
  // deno_dom doesn't bubble event when the direct target dom doesn't have event handler
  sibling.addEventListener("click", () => {});
  sibling.dispatchEvent(new Event("click", { bubbles: true }));
  assertEquals(calledCount, 1);
  const root = queryByClass("root")!;
  // FIXME(kt3k): workaround for deno_dom & deno issue
  // deno_dom doesn't bubble event when the direct target dom doesn't have event handler
  root.addEventListener("click", () => {});
  root.dispatchEvent(new Event("click", { bubbles: true }));
  assertEquals(calledCount, 2);

  // checks if the event listener is removed after unmount
  unmount(name, queryByClass(name));
  sibling.dispatchEvent(new Event("click", { bubbles: true }));
  root.dispatchEvent(new Event("click", { bubbles: true }));
  assertEquals(calledCount, 2);
});

Deno.test("pub, sub works", () => {
  const EVENT = "my-event";
  const name1 = randomName();
  const name2 = randomName();
  let subCalled = false;
  document.body.innerHTML = `
    <div class="${name1}"></div>
    <div class="${name2}"></div>
  `;
  function SubComponent({ on, sub }: Context) {
    sub(EVENT);
    on[EVENT] = () => {
      subCalled = true;
    };
  }
  function PubComponent({ pub }: Context) {
    pub(EVENT);
  }
  register(SubComponent, name1);
  assert(!subCalled);
  register(PubComponent, name2);
  assert(subCalled);
});

Deno.test("query, queryAll works", () => {
  const name = randomName();
  document.body.innerHTML = `
    <div class="${name}">
      <p>foo</p>
      <p>bar</p>
      <p>baz</p>
    </div>
  `;
  function Component({ query, queryAll }: Context) {
    assert(query("p") !== null);
    assertEquals(query("p")?.textContent, "foo");

    assertEquals(queryAll("p")[0].textContent, "foo");
    assertEquals(queryAll("p")[1].textContent, "bar");
    assertEquals(queryAll("p")[2].textContent, "baz");
  }
  register(Component, name);
});

Deno.test("assign wrong type to on.event, on.outside.event, on(selector).event", () => {
  function Component({ on }: Context) {
    assertThrows(() => {
      on.click = "";
    });
    assertThrows(() => {
      on.click = 1;
    });
    assertThrows(() => {
      on.click = Symbol();
    });
    assertThrows(() => {
      on.click = {};
    });
    assertThrows(() => {
      on.click = [];
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(".btn").click = "" as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(".btn").click = 1 as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(".btn").click = Symbol() as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(".btn").click = {} as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(".btn").click = [] as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on.outside.click = "" as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on.outside.click = 1 as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on.outside.click = Symbol() as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on.outside.click = {} as any;
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on.outside.click = [] as any;
    });
  }
  register(Component, randomName());
});

Deno.test("wrong type selector throws with on(selector).event", () => {
  function Component({ on }: Context) {
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(1 as any);
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(1n as any);
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on({} as any);
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on([] as any);
    });
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on((() => {}) as any);
    });
  }
  register(Component, randomName());
});

Deno.test("register throws with non string input", () => {
  function Component() {}
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, 1 as any);
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, 1n as any);
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, Symbol() as any);
  });
  assertThrows(() => {
    // empty name throws
    register(Component, "");
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, (() => {}) as any);
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, {} as any);
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, [] as any);
  });
});

Deno.test("register throws with already registered name", () => {
  const name = randomName();
  function Component() {}
  register(Component, name);
  assertThrows(() => {
    register(Component, name);
  });
});

Deno.test("unmount with non registered name throws", () => {
  assertThrows(() => {
    unmount(randomName(), document.body);
  });
});

Deno.test("mount() throws with unregistered name", () => {
  assertThrows(() => {
    mount(randomName());
  });
});

Deno.test("on.foo returns null", () => {
  const name = randomName();
  document.body.innerHTML = `<div class="${name}"><div>`;

  function Component({ on }: Context) {
    assertEquals(on.foo, null);
  }
  register(Component, name);
});

// test utils
const randomName = () => "c-" + Math.random().toString(36).slice(2);
const queryByClass = (name: string) => {
  const el = document.querySelector<HTMLElement>(`.${name}`);
  assertExists(el);
  return el;
};
