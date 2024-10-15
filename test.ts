// Copyright 2022 Yoshiya Hinosawa. All rights reserved. MIT license.

import { assert, assertEquals, assertExists, assertThrows } from "@std/assert"
import { delay } from "@std/async"
import "./dom_polyfill.ts"
import { type Context, mount, register, unmount } from "./mod.ts" // disable debug logs because it's too verbose for unit testing
 // deno-lint-ignore no-explicit-any
;(globalThis as any).__DEV__ = false

Deno.test("Component body is called when the component is mounted", () => {
  const name = randomName()

  document.body.innerHTML = `<div class="${name}"></div>`

  let called = false

  function Component() {
    called = true
  }

  register(Component, name)
  assert(called)
})

Deno.test("onUnmount registers the event handler for the unmount event", () => {
  const name = randomName()

  document.body.innerHTML = `<div class="${name}"></div>`

  let called = false

  function Component({ onUnmount }: Context) {
    onUnmount(() => {
      console.log("onUnmount called")
      called = true
    })
  }
  register(Component, name)

  mount()
  assert(!called)
  unmount(name, document.body.firstChild!)
  assert(called)
})

Deno.test("unmount removes the event listeners", () => {
  const name = randomName()

  document.body.innerHTML = `<div class="${name}"></div>`
  const div = queryByClass(name)

  let count = 0
  function Component({ on }: Context) {
    on("my-event", (_e) => {
      count++
    })
  }
  register(Component, name)

  assertEquals(count, 0)
  div.dispatchEvent(new CustomEvent("my-event"))
  assertEquals(count, 1)
  div.dispatchEvent(new CustomEvent("my-event"))
  assertEquals(count, 2)
  unmount(name, div!)
  div.dispatchEvent(new CustomEvent("my-event"))
  assertEquals(count, 2)
})

Deno.test("on[event] is called when the event is dispatched", () => {
  const name = randomName()

  document.body.innerHTML = `<div class="${name}"></div>`
  const div = queryByClass(name)

  let called = false
  function Component({ on }: Context) {
    on("click", () => {
      called = true
    })
    on("click", () => {
      called = true
    })
  }
  register(Component, name)

  div.dispatchEvent(new Event("click"))
  assert(called)
})

Deno.test("on(selector)[event] is called when the event is dispatched only under the selector", async () => {
  const name = randomName()

  document.body.innerHTML =
    `<div class="${name}"><button class="btn1"></button><button class="btn2"></button></div>`

  let onBtn1ClickCalled = false
  let onBtn2ClickCalled = false

  function Component({ on }: Context) {
    on("click", ".btn1", () => {
      onBtn1ClickCalled = true
    })

    on("click", ".btn2", () => {
      onBtn2ClickCalled = true
    })
  }
  register(Component, name)

  const btn = queryByClass("btn1")
  // FIXME(kt3k): workaround for deno_dom & deno issue
  // deno_dom doesn't bubble event when the direct target dom doesn't have event handler
  btn.addEventListener("click", () => {})
  btn.dispatchEvent(new Event("click", { bubbles: true }))
  await new Promise((r) => setTimeout(r, 100))

  assert(onBtn1ClickCalled)
  assert(!onBtn2ClickCalled)
})

Deno.test("on(option)[event] is called with option as AddEventListnerOptions", () => {
  const name = randomName()
  document.body.innerHTML = `<div class="${name}"></div>`
  let count = 0
  function Component({ on }: Context) {
    on("click", { once: true }, (_e) => count++)
    // for checking type
    on("touchmove", { passive: false }, (_e) => {})
  }
  register(Component, name)
  const div = queryByClass(name)
  div.dispatchEvent(new Event("click"))
  div.dispatchEvent(new Event("click"))
  assertEquals(count, 1)
})

Deno.test("on.outside.event works", () => {
  const name = randomName()

  document.body.innerHTML =
    `<div class="root"><div class="${name}"></div><div class="sibling"></div></div>`

  let calledCount = 0
  function Component({ onOutside }: Context) {
    onOutside("click", () => {
      calledCount++
    })
  }
  register(Component, name)

  assertEquals(calledCount, 0)

  const sibling = queryByClass("sibling")!
  // FIXME(kt3k): workaround for deno_dom & deno issue
  // deno_dom doesn't bubble event when the direct target dom doesn't have event handler
  sibling.addEventListener("click", () => {})
  sibling.dispatchEvent(new Event("click", { bubbles: true }))
  assertEquals(calledCount, 1)
  const root = queryByClass("root")!
  // FIXME(kt3k): workaround for deno_dom & deno issue
  // deno_dom doesn't bubble event when the direct target dom doesn't have event handler
  root.addEventListener("click", () => {})
  root.dispatchEvent(new Event("click", { bubbles: true }))
  assertEquals(calledCount, 2)

  // checks if the event listener is removed after unmount
  unmount(name, queryByClass(name))
  sibling.dispatchEvent(new Event("click", { bubbles: true }))
  root.dispatchEvent(new Event("click", { bubbles: true }))
  assertEquals(calledCount, 2)
})

Deno.test("query, queryAll works", () => {
  const name = randomName()
  document.body.innerHTML = `
    <div class="${name}">
      <p>foo</p>
      <p>bar</p>
      <p>baz</p>
    </div>
  `
  function Component({ query, queryAll }: Context) {
    assert(query("p") !== null)
    assertEquals(query("p")?.textContent, "foo")

    assertEquals(queryAll("p")[0].textContent, "foo")
    assertEquals(queryAll("p")[1].textContent, "bar")
    assertEquals(queryAll("p")[2].textContent, "baz")
  }
  register(Component, name)
})

Deno.test("assign wrong type to on.event, on.outside.event, on(selector).event", () => {
  function Component({ on, onOutside }: Context) {
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", "" as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", 1 as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", Symbol() as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", {} as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", [] as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", ".btn", "" as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", ".btn", 1 as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", ".btn", Symbol() as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", ".btn", {} as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on("click", ".btn", [] as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      onOutside("click", "" as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      onOutside("click", 1 as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      onOutside("click", Symbol() as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      onOutside("click", {} as any)
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      onOutside("click", [] as any)
    })
  }
  register(Component, randomName())
})

Deno.test("wrong event type call throws", () => {
  const name = randomName()
  document.body.innerHTML = `<div class="${name}"><div>`
  function Component({ on }: Context) {
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(1 as any, () => {})
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(1n as any, () => {})
    })
    assertThrows(() => {
      // deno-lint-ignore no-explicit-any
      on(1n as any, () => {})
    })
  }
  register(Component, name)
})

Deno.test("register() throws with non string input", () => {
  function Component() {}
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, 1 as any)
  })
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, 1n as any)
  })
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, Symbol() as any)
  })
  assertThrows(() => {
    // empty name throws
    register(Component, "")
  })
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, (() => {}) as any)
  })
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, {} as any)
  })
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    register(Component, [] as any)
  })
})

Deno.test("register() throws with already registered name", () => {
  const name = randomName()
  function Component() {}
  register(Component, name)
  assertThrows(() => {
    register(Component, name)
  })
})

Deno.test("unmount() with non registered name throws", () => {
  assertThrows(() => {
    unmount(randomName(), document.body)
  })
})

Deno.test("mount() throws with unregistered name", () => {
  assertThrows(() => {
    mount(randomName())
  })
})

// test utils
const randomName = () => "c-" + Math.random().toString(36).slice(2)
const queryByClass = (name: string) => {
  const el = document.querySelector<HTMLElement>(`.${name}`)
  assertExists(el)
  return el
}

Deno.test("Component with narrower HTML element type works", () => {
  function Component({ el }: Context<HTMLDivElement>) {
    el.classList.add("foo")
  }

  register(Component, randomName())
})

Deno.test("Returned string from Component is rendered", () => {
  const name = randomName()
  document.body.innerHTML = `<div class="${name}"><div>`
  function Component() {
    return "<p>hello</p>"
  }
  register(Component, name)
  assertEquals(queryByClass(name).innerHTML, "<p>hello</p>")
})

Deno.test("Resolved string from Component is rendered as innerHTML", async () => {
  const name = randomName()
  document.body.innerHTML = `<div class="${name}"><div>`
  function Component() {
    return Promise.resolve("<p>hello</p>")
  }
  register(Component, name)
  await delay(100)
  assertEquals(queryByClass(name).innerHTML, "<p>hello</p>")
})
