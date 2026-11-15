# Keywatch - keyboard events for web-apps

## What is Keywatch?

Keywatch is a JavaScript browser library that provides helper functions for listening to keyboard events.

## What can I do with it?

You can configure page-wide keyboard shortcuts and bind them to handler functions.

Example:
```js
watch('^z', undo)
```

or see the DEMO.

Additionally, it also provides **Vue 3 bindings** to handle keyboard events only while a component is mounted.

## Getting Started

### Installation

```sh
# with npm
npm install --save keywatch
```

```sh
# with yarn
yarn add keywatch
```

```sh
# with pnpm
pnpm add keywatch
```

### TypeScript

Type definitions ship with the package and are generated from the sources, so no separate
`@types` package is needed.

### Integration to any HTML Page

Assuming you can use JavaScript Modules you can use the default provided method as a single point of entry. You probably won't need the rest, but can access it nevertheless. 

```html
<script type="module">
import { watch } from 'keywatch'
watch('Control KeyS', () => {
  console.log('call save')
})
</script>
```

### Integration with Vue 3

The Vue bindings live in their own entry point, so the core stays free of any framework
dependency. With the Composition API:

```vue
<script setup>
import { watchKeys } from 'keywatch/vue'

function doStuff () {
  // ...
}

watchKeys({
  'ctrl KeyD': doStuff,
})
</script>
```

The same with the Options API:

```js
import { Mixin } from 'keywatch/vue'

export default {
  mixins: [
    Mixin({
      'ctrl KeyD' () { this.doStuff() },
    })
  ],
  methods: {
    doStuff () {
      // ...
    }
  }
}
```

keywatch 2 requires Vue 3. For Vue 2 use keywatch 1.x.

## Defining Watchers

In order to actively watch something you have to define what keys should trigger a reaction.
This can be done via very simple to rather complex configurations. Let's get to it.

### Single Keys

To catch a keyboard input we have to determine either it's **key** or **code**.
The naive way to do this is to type it:

```js
watch('a', action) // will trigger on pressing key 'A' 
watch('b', action) // will trigger on pressing key 'B' 
watch('c', action) // will trigger on pressing key 'C'
// ... and so on
```

This is trivial for letters and numbers, but what about other keys, like *Enter*, *Escape* or *Arrows*?

These can be caught by using their [Codes](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values).
That's especially necessary for chars like `,_#@!?`, so when in doubt, stick to the *codes*.

```js
watch('Enter', action)
watch('Escape', action)
watch('ArrowUp', action)
watch('ArrowDown', action)
watch('Comma', action)
// ...
```

#### Modifiers

The Keys can be further specified by selecting one or many *Modifier* keys of `Shift`, `Alt`, `Control` or `Meta`.
The latter is also known as `Command` on Mac and `Win` on Windows, but access to these keys is somewhat restricted.

```js
watch('Shift KeyA', action)
watch('Alt KeyS', action)
watch('Control KeyD', action)
watch('Meta KeyF', action)
```

These can be combined to be even more specific:

```js
watch("Shift Alt KeyA", action) // will not trigger on Shift-A or Alt-A alone
```

#### Ignoring in Input-Fields

If you don't want to execute the shortcut while I'm actively editing an `INPUT|TEXTAREA|SELECT`, use the `NoInput` (short `:`) prefix.
```js
watch('NoInput KeyD', doStuff)
watch(':d', doStuff)
```

#### Watch several keys at once

### Sequences

You can combine several single watched keys to a sequence, either by providing an `Array`
or in a single `String` separated by Comma `,`. The full sequence has to be matched with 
no other key in between to trigger the action.

Example:
```js
watch(['^w', '^s'], splitWindow)
watch(['Escape', 'Colon', 'KeyW', 'KeyQ', 'Shift Digit1', 'Enter'], saveAndExit)
watch('i,d,d,q,d', enableGodmode)
```

### All key options

| Option | Short | Description | Example |
| ------ |:-----:| ----------- | ------- |
| Shift | + *or* ⇧ | requires the shift key to be down | +ArrowUp *or* ⇧KeyX |
| Alt | # *or* ⌥ | requires the alt key to be down | #e / ⌥Enter |
| Control | ^ *or* Ctrl | requires the **Control** key to be down | ^Space |
| Meta / Command | @ *or* ⌘ | requires the Meta/Win/Command key to be down | @KeyQ *or* ⌘KeyL |
| NoInput | : | does not trigger in `INPUT` *or* `TEXTAREA` *or* `SELECT` input fields | :Backspace |
| NoDefault | ! | Prevents default behaviour (when applicable) if the *whole sequence* has been matched | !⌘F | 

## Handling Events

In most cases you won't care much for the event, that triggered the key sequence, but in case you do,
you can access it as the first argument of the handler. The second argument is the `KeySequence`
that matched.

```js
watch('i,d,d,q,d', (event, sequence) => {
  // event is the KeyboardEvent of the last key, the 'd'
  console.log(event.target, sequence)
})
```

## Unwatching

In order to *clean up* after you have used a watcher the `watch` function will return itself return a function,
that disposes all watchers it has created.

```js
// setUp
const unwatch = watch({
  Control_KeyS: () => this.save()
})

// tearDown
unwatch()
```

Alternatively you can specify a reference to which the watcher is bound on creation and `unwatchAll` of that reference.
```js
import { watch, unwatchAll } from 'keywatch'

// setUp
const reference = {}
watch('^z', () => this.undo(), reference)


// tearDown
unwatchAll(reference)
```

## Vue 3

### watchKeys

`watchKeys` is the Composition API binding. It watches the given keys for as long as the
calling component is mounted and returns a disposer for everything else.

```vue
<script setup>
import { watchKeys } from 'keywatch/vue'

watchKeys({
  'Alt KeyS': () => save(),
  'Escape': () => close(),
})
</script>
```

Besides the definitions that `watch` accepts, it also takes a `ref`, a `computed` or a
plain getter. Reactive sources are rebound whenever they change, so the watched keys can
follow the state of the component:

```js
const keys = computed(() => isEditing.value
  ? { 'Escape': cancel, '^s': save }
  : { 'KeyE': edit })

watchKeys(keys)
```

A `Promise` that resolves to a definition is accepted as well. Nothing is watched until it has
resolved, and if the component is unmounted or the disposer is called before that, nothing is
watched at all.

### Mixin

`Mixin` is the Options API binding. It starts watching in the component's `mounted` hook and
disposes every watcher automatically in `beforeUnmount`, so the keys are only active while
the component is mounted.

```js
import { createApp } from 'vue'
import { Mixin } from 'keywatch/vue'

createApp({
  mixins: [
    Mixin({
      'Alt KeyS' () {
        // 'this' is the component instance
        this.doStuff()
      }
    }),
  ],
  methods: {
    doStuff () {
      // work, work
    }
  }
}).mount('#app')
```

`Mixin` accepts the same definitions as `watch`. Every handler is bound to the component
instance, so `this` refers to it - as long as the handler is written as a method or a
`function`. An arrow function keeps the `this` of its surrounding scope instead.

#### Reactive definitions

Passing a string does not define a key: it names a data property, prop or computed of the
component that provides the definitions. The watchers are rebuilt whenever its value changes,
and a falsy value watches nothing at all.

```js
mixins: [Mixin('keys')],
data: () => ({ isEditing: false }),
computed: {
  keys () {
    return this.isEditing
      ? { 'Escape': () => this.cancel(), '^s': () => this.save() }
      : { 'KeyE': () => this.edit() }
  }
}
```

This is the Options API counterpart to passing a `computed` to `watchKeys`.

#### Promised definitions

A `Promise` that resolves to a definition is accepted as well, both directly and as the value
of a named property. The keys are watched as soon as it has resolved, and if the component is
unmounted before that, nothing is watched at all.

```js
mixins: [Mixin(import('./shortcuts.js').then(module => module.default))]
```

#### $watchKeys

The mixin also adds `$watchKeys(keys, handler)` to the instance, for bindings that are set up
later on. It takes a definition and a handler like `watch` and returns a disposer. Whatever
is still watched on unmount is disposed along with the rest.

Unlike the definitions passed to `Mixin`, the handler is not bound to the instance. In Vue 3
that rarely matters: methods are already bound, and an arrow function keeps the `this` of the
hook it was written in.

Called without an argument, the mixin watches nothing by itself and only provides
`$watchKeys`:

```js
export default {
  mixins: [Mixin()],
  mounted () {
    this.$watchKeys('^s', this.save)
  },
  methods: {
    save () {
      // ...
    }
  }
}
```

#### Migrating from keywatch 1.x

- The mixin moved to its own entry point: `import { Mixin } from 'keywatch/vue'` instead of
  `'keywatch'`. Without a bundler it is `KeywatchVue.Mixin` from `dist/vue.iife.js` instead of
  `Keywatch.Mixin`.
- The second parameter `options` is gone. It was never evaluated.
- The watchers are disposed in `beforeUnmount`, since Vue 3 no longer calls `beforeDestroy`.

## Limitations

### It is restricted to your browser

Some browsers may not allow you to rebind keys, especially when you would overwrite core browser functions.
Some operating systems may as well catch the keys and prevent the browser from receiving them.
In these cases you'd have to use different shortcuts.

### Conflicting Keys

How do I work with conflicting keys?

## Troubleshooting

### Function is unused (IntelliJ / WebStorm)

When defining the keys for a Vue mixin via object syntax, IntelliJ denotes the functions as *unused*. This is technically correct as the functions may never be used with that name.
You can avoid this behaviour by using a quoted name. Instead of

```js
  mixins: [Mixin({
    ArrowUp () { },
    ArrowDown () { },
  })]
```

write

```js
  mixins: [Mixin({
    'ArrowUp' () { },
    'ArrowDown' () { },
  })]
```

## F.A.Q.

### What is it good for?

It emerged from several work projects where we created intranet web apps, that replaced old terminal alls.
These original apps made heavy use of keyboard shortcuts, wich we wanted to do as well.
The multi-key part of it came by accident when the need for a 2-key sequence came up. So here we are.

### Does it work with Hot Module Replacement (HMR)?

The bindings are tied to the component lifecycle, so `watchKeys` and `Mixin` dispose their
watchers on unmount and a reload rebinds them.

Watchers registered directly through `watch` outside of a component are not covered by that.
keywatch ships a dispose handler for the webpack style `module.hot`; under Vite
(`import.meta.hot`) it does not fire, so dispose those watchers yourself. If something else
misbehaves feel free to [open an issue](https://github.com/tharabas/keywatch/issues).

### Why is it called Keywatch?

It's short, describes what's primarily done by the library and last, but not least, the npm name was available.
When I stared working on it, the name was *Shortcuts*.

### Is this all?

This README and the DEMO are a *work-in-progress*, but I hope to update it soon.
