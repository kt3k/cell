<img src="https://kt3k.github.io/cell/cell-logo.svg" width="70" alt="cell" />

# Cell v0.2.2

> frontend tool for local event handlers and signals

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

## Basic usages

```ts
import { type Context, register } from "@kt3k/cell";

function MyComponent({ on }: Context) {
  on.click = () => {
    alert("hello");
  };
}

register(MyComponent, "js-hello");
```

```
<div class="js-hello">Click</div>
```

## More examples

Mirrors input value of `<input>` element to another dom.

```ts
import { type Context, register } from "@kt3k/cell";

function Mirroring({ on, query }: Context) {
  on.input = () => {
    query(".src").textContent = query(".dest").value;
  };
}

register(Mirroring, "js-mirroring");
```

Prevent default, stop propagation.

```ts
import { type Context, register } from "@kt3k/cell";

function PrevetDefaultComponent({ on }: Context) {
  on.click = (e) => {
    // e is the native event object.
    // You can call methods of Event object
    e.stopPropagation();
    e.preventDefault();
  };
}

register(PreventDefaultComponent, "js-prevent-default");
```

Event delegation. You can assign handlers to `on(selector).event` to use
[event delegation](https://www.geeksforgeeks.org/event-delegation-in-javascript/)
pattern.

```js
import { register, type Context } from "@kt3k/cell";

function DelegateComponent({ on, query }: Context) {
  on(".btn").click = () => {
    query(".result").textContext += " .btn clicked!";
  }
}

register(DelegateComponent, "js-delegate");
```

Outside event handler. By assigning `on.outside.event`, you can handle the event
outside of the component dom.

```ts
import { type Context, register } from "@kt3k/cell";

function OutsideClickComponent({ on }: Context) {
  on.outside.click = ({ e }) => {
    console.log("The outside of my-component has been clicked!");
  };
}

register(OutsideClickComponent, "js-outside-click");
```

## How `cell` works

Let's look at the below basic example.

```ts
import { type Context, register } from "@kt3k/cell";

function MyComponent({ on }: Context) {
  on.click = () => {
    console.log("clicked");
  };
}

register(MyComponent, "my-component");
```

This code is roughly translated into jQuery like the below:

```js
$(document).read(() => {
  $(".my-component").each(function () {
    $this = $(this);

    if (isAlreadyInitialized($this)) {
      return;
    }

    $this.click(() => {
      console.log("clicked");
    });
  });
});
```

`cell` can be seen as a syntax sugar for the above pattern (with a few more
utilities).

## Using Cell directly from the browser

```html
<script type="module">
import { register } from "https://kt3k.github.io/cell/dist.min.js";

function Mirroring({ on, query }) {
  on.input = () => {
    query(".dest").textContent = query(".src").value;
  };
}

register(Mirroring, "js-mirroring");
</script>
<div class="js-mirroring">
  <input class="src" placeholder="Type something" />
  <p class="dest"></p>
</div>
```

## Motivation

Virtual DOM frameworks are good for many use cases, but sometimes they are
overkill for the use cases where you only need a little bit of event handlers
and dom modifications.

This `cell` library explores the new way of simple event-driven DOM programming
without virtual dom.

## Slogans

- Local query is good. Global query is bad.
- Define behaviors based on HTML classes.
- Use signal when making remote effect.

### Local query is good. Global query is bad

When people use jQuery, they often do:

```js
$(".some-class").each(function () {
  $(this).on("some-event", () => {
    $(".some-target").each(function () {
      // some effects on this element
    });
  });
});
```

This is very common pattern, and this is very bad.

The above code can been seen as a behavior of `.some-class` elements, and they
use global query `$(".some-target")`. Because they use global query here, they
depend on the entire DOM tree of the page. If the page change anything in it,
the behavior of the above code can potentially be changed.

This is so unpredictable because any change in the page can affect the behavior
of the above class. You can predict what happens with the above code only when
you understand every details of the entire application, and that's often
impossible when the application is large size, and multiple people working on
that app.

So how to fix this? We recommend you should use **local** queries.

Let's see this example:

```js
$(".some-class").each(function () {
  $(this).on("some-event", () => {
    $(this).find(".some-target").each(function () {
      // some effects on this element
    });
  });
});
```

The difference is `$(this).find(".some-target")` part. This selects the elements
only under each `.some-class` element. So this code only depends on the elements
inside it, which means there is no global dependencies here.

`cell` enforces this pattern by providing `query` function to the component
which only finds elements under the given element.

```ts
function MyComponent({ on, query }: Context) {
  on.click = () => {
    query(".some-target")!.textContent = "clicked";
  };
}
```

Here `query` is the alias of `el.querySelector` and it finds `.some-target` only
under it. So the dependency is **local** here.

### Define behaviors based on HTML classes

From our observation, skilled jQuery developers always define DOM behaviors
based on HTML classes.

We borrowed this pattern, and `cell` allows you to define behavior only based on
HTML classes, not random combination of query selectors.

```html
<div class="hello">John Doe</div>
```

```js
function MyComponent({ on }: Context) {
  alert(`Hello, I'm ${el.textContext}!`);
}

register(MyComponent, "js-hello");
```

### Use signal when making remote effect

We generally recommend using only local queries, but how to make effects to the
remote elements?

We reommend using signal pattern here. By using this pattern, you can decouple
those affecting and affected elements. If you decouple those elements, you can
test those components independently by using events as I/O of those components.

`cell` library provides `signal` API for supporting this pattern.

TBD

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
