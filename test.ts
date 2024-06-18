// Copyright 2022 Yoshiya Hinosawa. All rights reserved. MIT license.

import { assert, assertExists, assertFalse } from "@std/assert";
import "./dom_polyfill.ts";
import { type Context, mount, register } from "./mod.ts";

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

  assertFalse(called);

  mount();

  assert(called);
});

Deno.test("sub() add sub:type class to the dom", () => {
  const name = randomName();

  document.body.innerHTML = `<div class="${name}"></div>`;

  function Component({ el, sub }: Context) {
    el.classList.add("foo");
    sub("bar");
    return "<p>hello</p>";
  }

  register(Component, name);

  mount();

  const div = document.body.querySelector(`.${name}`);

  assertExists(div);
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

Deno.test("unmount removes the event listeners", () => {
  const name = randomName();
  const { on } = component(name);

  document.body.innerHTML = `<div class="${name}"></div>`;
  const el = queryByClass(name);

  let count = 0;
  on["my-event"] = () => {
    count++;
  };
  mount();
  assertEquals(count, 0);
  el?.dispatchEvent(new CustomEvent("my-event"));
  assertEquals(count, 1);
  el?.dispatchEvent(new CustomEvent("my-event"));
  assertEquals(count, 2);
  unmount(name, el!);
  el?.dispatchEvent(new CustomEvent("my-event"));
  assertEquals(count, 2);
});

Deno.test("on[event] is called when the event is dispatched", () => {
  const name = randomName();
  const { on } = component(name);

  document.body.innerHTML = `<div class="${name}"></div>`;

  let called = false;

  on.click = () => {
    called = true;
  };

  mount();

  query("div")?.dispatchEvent(new Event("click"));
  assert(called);
});

Deno.test("on(selector)[event] is called when the event is dispatched only under the selector", async () => {
  const name = randomName();
  const { on } = component(name);

  document.body.innerHTML =
    `<div class="${name}"><button class="btn1"></button><button class="btn2"></button></div>`;

  let onBtn1ClickCalled = false;
  let onBtn2ClickCalled = false;

  on(".btn1").click = () => {
    onBtn1ClickCalled = true;
  };

  on(".btn2").click = () => {
    onBtn2ClickCalled = true;
  };

  mount();

  const btn = queryByClass("btn1");
  // FIXME(kt3k): workaround for deno_dom & deno issue
  // deno_dom doesn't bubble event when the direct target dom doesn't have event handler
  btn?.addEventListener("click", () => {});
  btn?.dispatchEvent(new Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));

  assert(onBtn1ClickCalled);
  assert(!onBtn2ClickCalled);
});

Deno.test("on.outside.event works", () => {
  const name = randomName();
  const { on } = component(name);

  document.body.innerHTML =
    `<div class="root"><div class="${name}"></div><div class="sibling"></div></div>`;

  let calledCount = 0;

  on.outside.click = () => {
    calledCount++;
  };

  mount();
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
});

Deno.test("`is` works", () => {
  const name = randomName();
  const { is } = component(name);
  document.body.innerHTML = `<div class="${name}"></div>`;
  is("foo");
  mount();
  assert(queryByClass(name)?.classList.contains("foo"));
});
Deno.test("innerHTML works", () => {
  const name = randomName();
  const { innerHTML } = component(name);
  document.body.innerHTML = `<div class="${name}"></div>`;
  innerHTML("<p>hello</p>");
  mount();
  assertEquals(queryByClass(name)?.innerHTML, "<p>hello</p>");
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
  {
    const { on, sub } = component(name1);
    sub(EVENT);
    on[EVENT] = () => {
      subCalled = true;
    };
  }
  {
    const { on } = component(name2);
    on.__mount__ = ({ pub }) => {
      pub(EVENT);
    };
  }
  assert(!subCalled);
  mount();
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
  const { on } = component(name);
  on.__mount__ = ({ query, queryAll }) => {
    assert(query("p") !== null);
    assertEquals(query("p")?.textContent, "foo");

    assertEquals(queryAll("p")[0].textContent, "foo");
    assertEquals(queryAll("p")[1].textContent, "bar");
    assertEquals(queryAll("p")[2].textContent, "baz");
  };
});
Deno.test("assign wrong type to on.event, on.outside.event, on(selector).event", () => {
  const { on } = component(randomName());
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
});
Deno.test("wrong type selector throws with on(selector).event", () => {
  const { on } = component(randomName());
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
});
Deno.test("component throws with non string input", () => {
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    component(1 as any);
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    component(1n as any);
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    component(Symbol() as any);
  });
  assertThrows(() => {
    // empty name throws
    component("");
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    component((() => {}) as any);
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    component({} as any);
  });
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    component([] as any);
  });
});
Deno.test("component throws with already registered name", () => {
  const name = randomName();
  component(name);
  assertThrows(() => {
    component(name);
  });
});

Deno.test("unmount with non registered name throws", () => {
  assertThrows(() => {
    unmount(randomName(), document.body);
  });
});


const query = (s: string) => document.querySelector<HTMLElement>(s);
const queryByClass = (name: string) =>
  document.querySelector<HTMLElement>(`.${name}`);

*/
// test utils
const randomName = () => "c-" + Math.random().toString(36).slice(2);
