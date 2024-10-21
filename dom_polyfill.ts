// Copyright 2022-2024 Yoshiya Hinosawa. All rights reserved. MIT license.

import { DOMParser } from "@b-fuze/deno-dom" // deno-lint-ignore no-explicit-any
;(globalThis as any).document = new DOMParser().parseFromString(
  "<body></body>",
  "text/html",
) // deno-lint-ignore no-explicit-any
;(document as any).readyState = "complete"
