<img src="https://kt3k.github.io/cell/cell-logo.svg" width="70" alt="cell" />

# Cell v0.3.4

> A frontend UI tool, encourages local event handlers and signals

## Features

- Cell encourages **local event handlers**
- Cell provides **signals** for remote effects
- **Lightweight** (**< 1.5 kiB** gzipped)
- **TypeScript** friendly

## Live examples

See [the live demos](https://kt3k.github.io/cell).

## TodoMVC

TodoMVC implementation is also available
[here](https://github.com/kt3k/cell-todomvc).

## Install

```
npx jsr add @kt3k/cell
```

Or, in Deno,

```
deno add @kt3k/cell
```

## Hello world: How to use `on` helper

The below is an example of `cell` component. A `cell` component is a function of
the type `(ctx: Context) => string | undefined`.

`Context` includes many handy helpers for implementing UI behavior easily and
quickly.

The below example uses `on` helper, which registers the event handler to the
mounted dom element, which is `<button>` element in this case.

```ts
import { type Context, register } from "@kt3k/cell"

function MyComponent({ on }: Context) {
  on("click", () => {
    alert("hello")
  })
}

register(MyComponent, "js-hello")
```

```html
<button class="js-hello">Click</button>
```

When you click this button, it alerts "hello".

## Mirroring the inputs: How to use `query` helper

The next component shows how you can copy the input text into other dom element.

`query` is helper to query by the selector inside your component.
`query(".dest")` is equivalent of `el.querySelector(".dest")`.

```ts
import { type Context, register } from "@kt3k/cell"

function Mirroring({ on, query }: Context) {
  on("input", () => {
    query(".dest").textContent = query(".src").value
  })
}

register(Mirroring, "js-mirroring")
```

```html
<div class="js-mirroring">
  <input class="src" placeholder="type something" />
  <p class="dest"></p>
</div>
```

## Event Delegation: The 2nd arg of `on` helper

If you pass a string (a selector) as the second argument of `on` function, the
event handler is only invoked when the event comes from the element which
matches the given selector.

```ts
import { type Context, register } from "@kt3k/cell"

function DelegateComponent({ on, query }: Context) {
  on("click", ".btn", () => {
    query(".result").textContext += " .btn clicked!"
  })
}

register(DelegateComponent, "js-delegate")
```

## Outside events: `onOutside` helper

By calling `onOutside(event, handler)`, you can handle the event outside of the
component's DOM.

This is convenient, for example, when you like to close the modal dialog when
the user clicking the outside of it.

```ts
import { type Context, register } from "@kt3k/cell"

function OutsideClickComponent({ onOutside }: Context) {
  onOutside("click", ({ e }) => {
    console.log("The outside of my-component has been clicked!")
  })
}

register(OutsideClickComponent, "js-outside-click")
```

## Using Cell directly from the browser

The below example shows how you can use `cell` directly in the browsers.

```html
<script type="module">
import { register } from "https://kt3k.github.io/cell/dist.min.js";

function Mirroring({ on, query }) {
  on("input", () => {
    query(".dest").textContent = query(".src").value;
  });
}

register(Mirroring, "js-mirroring");
</script>
<div class="js-mirroring">
  <input class="src" placeholder="Type something" />
  <p class="dest"></p>
</div>
```

## Use signals when making remote effect

`cell` generally recommend handling event locally, but in many cases you would
also need to make effects to remote elements.

If you need to affects the components in remote places (i.e. components not an
ancestor or decendant of the component), we commend using `signals` for
communicating with them.

`signals` are event emitter with values, whose events are triggered only when
the values are changed.

```
import { signal  } from "@kt3k/cell";

const sig = signal(0);

const stop = sig.onChange((v) => {
  alert(`The value changed to: ${v}!`);
});

sig.update(1);
sig.update(2);

stop();
```

## Prior art

- [capsule](https://github.com/capsidjs/capsule)
- [capsid](https://github.com/capsidjs/capsid)

## Projects with similar concepts

- [Flight](https://flightjs.github.io/) by twitter
  - Not under active development
- [eddy.js](https://github.com/WebReflection/eddy)
  - Archived

## History

- 2024-06-18 Forked from capsule.

## License

MIT
