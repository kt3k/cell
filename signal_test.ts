// Copyright 2024 Yoshiya Hinosawa. All rights reserved. MIT license.

import { assertSpyCall, assertSpyCalls, spy } from "@std/testing/mock";
import { assertEquals } from "@std/assert/equals";
import { signal } from "./signal.ts";

Deno.test("signal() creates Signal", () => {
  const s = signal(1);

  assertEquals(s.get(), 1);

  const cb = spy();

  const stop = s.onChange(cb);

  assertSpyCalls(cb, 0);

  s.update(2);
  assertSpyCalls(cb, 1);
  assertSpyCall(cb, 0, { args: [2] });

  s.update(3);
  assertSpyCalls(cb, 2);
  assertSpyCall(cb, 1, { args: [3] });

  s.update(3);
  assertSpyCalls(cb, 2);

  s.update(4);
  assertSpyCalls(cb, 3);
  assertSpyCall(cb, 2, { args: [4] });

  stop();

  s.update(5);
  assertSpyCalls(cb, 3);
});

Deno.test("signal() creates Signal with object", () => {
  const s = signal({ x: 0, y: 0 });

  assertEquals(s.get(), { x: 0, y: 0 });

  const cb = spy();

  const stop = s.onChange(cb);

  assertSpyCalls(cb, 0);

  s.update({ x: 1, y: 0 });

  assertSpyCalls(cb, 1);
  assertSpyCall(cb, 0, { args: [{ x: 1, y: 0 }] });

  s.update({ x: 1, y: 0 });

  assertSpyCalls(cb, 2);
  assertSpyCall(cb, 1, { args: [{ x: 1, y: 0 }] });

  s.updateByFields({ x: 1, y: 0 });

  assertSpyCalls(cb, 2);

  stop();
});
