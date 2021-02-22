# Keywatch - keyboard events for web-apps

## What is Keywatch?

Keywatch is a JavaScript browser library that provides helper functions for listening to keyboard events.

## What can I do with it?

You can configure page-wide keyboard shortcuts and bind them to handler functions.

Example:
```js
keywatch('^z', undo)
```

or see the DEMO.

Additionally, it also provides a **vue.js mixin** to handle keyboard events only while the mixing component is mounted.

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

### Integration with vue.js

For Integration in any vue.js component you can 

```js
import Keywatch from 'keywatch'

export default {
  mixins: [
    Keywatch.Mixin({
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

## Vue Mixin

When working with Vue, you can utilize the `Keywatch.Mixin` to specify `KeySequences`, which should only be watched
while a component is rendered.

```js
import Keywatch from 'keywatch'

new Vue({
  mixins: [
    Keywatch.Mixin({
      'Alt KeyS' () {
        // 'this' is the vue instance 
        this.doStuff()
      } 
    }),
  ],
  methods: {
    doStuff () {
      // work, work 
    }
  }
})
```

All watchers created like this will be disposed automatically during the components `beforeDestroy` method.

## Limitations

### It is restricted to your browser

Some browsers may not allow you to rebind keys, especially when you would overwrite core browser functions.
Some operating systems may as well catch the keys and prevent the browser from receiving them.
In these cases you'd have to use different shortcuts.

### Conflicting Keys

How do I work with conflicting keys?

## Troubleshooting

### Function is unused (IntelliJ / WebStorm)

When defining the keys for a Vue mixin via object syntax, IntelliJ denoes the funcitons as *unused*. This is tecnically correct as the functions may never be used with that name.
You can avoid this behaviour by using a quoted name:

```js
  mixins: [Keywatch.Mixin({
    ArrowUp () { },
    ArrowDown () { },
  })]
```

```js
  mixins: [Keywatch.Mixin({
    'ArrowUp' () { },
    'ArrowDown' () { },
  })]
```

## F.A.Q.

## What is it good for?

It emerged from several work projects where we created intranet web apps, that replaced old terminal alls.
These original apps made heavy use of keyboard shortcuts, wich we wanted to do as well.
The multi-key part of it came by accident when the need for a 2-key sequence came up. So here we are.

### Does it work with Hot Module Replacement (HMR)?

It should. If not feel free to [open an issue](https://github.com/tharabas/keywatch/issues).

### Why is it called Keywatch?

It's short, describes what's primarily done by the library and last, but not least, the npm name was available.
When I stared working on it, the name was *Shortcuts*.

### Is this all?

This README and the DEMO are a *work-in-progress*, but I hope to update it soon.
