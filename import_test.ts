// Copyright 2022-2024 Yoshiya Hinosawa. All rights reserved. MIT license.

import { DOMParser } from "@b-fuze/deno-dom"
import { assertEquals } from "@std/assert"
import { type Context, mount, register } from "./mod.ts"

function Component({ el }: Context) {
  el.textContent = "a"
}

Deno.test("register doesn't throw without polyfill", () => {
  register(Component, "js-component")
})

Deno.test("registered compenent can be mounted", () => {
  globalThis.document = new DOMParser().parseFromString(
    `<body><div class="js-component"></div></body>`,
    "text/html",
    // deno-lint-ignore no-explicit-any
  ) as any
  mount()
  assertEquals(document.body.firstChild?.textContent, "a")
})
