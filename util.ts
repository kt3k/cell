// Copyright 2022 Yoshiya Hinosawa. All rights reserved. MIT license.

const READY_STATE_CHANGE = "readystatechange"

let p: Promise<void>
export function documentReady(doc = document) {
  p ??= new Promise<void>((resolve) => {
    const checkReady = () => {
      if (doc.readyState === "complete") {
        resolve()
        doc.removeEventListener(READY_STATE_CHANGE, checkReady)
      }
    }

    doc.addEventListener(READY_STATE_CHANGE, checkReady)

    checkReady()
  })
  return p
}

interface LogEventMessage {
  component: string
  e: Event
  module: string
  color?: string
}

/** Gets the bold colored style */
const boldColor = (color: string): string =>
  `color: ${color}; font-weight: bold;`

const defaultEventColor = "#f012be"

declare const __DEV__: boolean
declare const DEBUG_IGNORE: undefined | Set<string>

export function logEvent({
  component,
  e,
  module,
  color,
}: LogEventMessage) {
  if (typeof __DEV__ === "boolean" && !__DEV__) return
  const event = e.type

  if (typeof DEBUG_IGNORE === "object" && DEBUG_IGNORE?.has(event)) return

  console.groupCollapsed(
    `${module}> %c${event}%c on %c${component}`,
    boldColor(color || defaultEventColor),
    "",
    boldColor("#1a80cc"),
  )
  console.log(e)

  if (e.target) {
    console.log(e.target)
  }

  console.groupEnd()
}
