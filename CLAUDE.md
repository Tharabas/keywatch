# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dist   # rollup build -> dist/{esm,esm.min,iife,iife.min}.js
```

There is no test setup (`npm test` exits 1), no linter and no dev server. Verification happens by
hand in the browser via the demo pages in `docs/`.

`dist/` is checked into git (not in `.gitignore`) and both `docs/index.html` and `docs/viewer.html`
load `../dist/iife.js`. A change in `src/` is therefore only visible in the demo after `npm run dist`,
and a commit that touches `src/` usually has to carry the rebuilt `dist/` files with it.

To try a change: `npm run dist`, then open `docs/viewer.html` (shows code/key/short/full for every
key event and lets you test a binding) or `docs/index.html` (guided tutorial). Both are plain files,
`open docs/viewer.html` is enough - no server needed.

## Architecture

A dependency-free ES-module browser library. `index.js` is the package entry and only re-exports:
the public API from `src/keys.js` plus the Vue mixin (default export of `src/vue-mixin.js`) as
`Mixin`. `src/lib.js` holds four trivial helpers. Everything of substance is in `src/keys.js`.

### Global singleton state

`src/keys.js` is a module-level singleton, not an instantiable service:

- `listeners` - all registered `KeySequenceListener`s. New ones are `unshift`ed, so the **most
  recently registered listener wins** when several match.
- `lastKeys` - the rolling buffer of `KeyboardEvent`s used to match multi-key sequences.
- `MaxKeptKeys` - buffer length; grows to the longest registered sequence and is recomputed
  (`afterUnwatch`) whenever listeners are removed.
- `isActive` - the two `document` listeners (`keyup` + `keydown`) are attached lazily by `setUp()`
  on the first watch and dropped by `tearDown()` once the last listener is gone.

Because the state is module-global, importing `keywatch` twice (e.g. `dist/esm.js` and `src/`)
creates two independent registries.

### From definition to listener

`watch(definition, reaction, ref)` is the single public entry point. The chain is:

1. `watch` - shifts arguments when the reaction slot actually holds the `ref`, then delegates.
2. `unfoldKeyDefinition` - normalizes every accepted shape into `{ sequence, handler }[]`: a
   function (called, then re-unfolded), a nested object (`{ 'Control': { KeyS () {} } }` - nested
   keys are joined with a space by `unfoldKeyObject`), a string, or an array. Invalid entries are
   warned about and dropped rather than thrown.
3. `KeySequence.parse` - strips the **sequence-level** flags first (`only-mac`/`on-win`/`on-nix`
   into `onSystem`, a leading `!` or `no-default`/`prevent` into `preventDefault`), then splits the
   rest on commas into single key definitions.
4. `Key.parse` - normalizes a **single** key: unicode aliases (`⌘⌥⇧↑⎋…`, table `CodeAliases`) and
   the short modifiers (`: ^ # @ +`) are regex-replaced by their long words, `_` is turned into a
   separator, and the result is split on whitespace. The last token is the event type; the one
   before it is the significant key. `isCode` is derived from its length (>1 char means match
   `event.code`, a single char means match `event.key`).
5. `watchSequence` - wraps it in a `KeySequenceListener`, raises `MaxKeptKeys`, calls `setUp()`,
   and returns a disposer.

Adding a modifier therefore means touching two places in `Key.parse`: the replace-rule that expands
the short form, and the `contains(modifier, ...)` check that consumes the long word.

### Matching

`handleGlobalKeys` is the whole runtime. Per event it copies `lastKeys`, collapses a `keyup` onto a
preceding `keydown` of the same code, appends the event and asks every listener whether the **tail**
of that buffer matches its sequence. On a match the buffer is cleared; `preventDefault` additionally
stops the loop. Modifier-only events (`Shift`, `Control`, `Alt`, `Meta`) are never kept in the
buffer, so they cannot break a sequence.

Two consequences worth remembering:

- Modifiers are matched **exactly** (`e.shiftKey !== this.shiftKey` fails the match), so `KeyA`
  does not fire on `Shift+A`.
- The default event type is `keyup`, except when `Meta` or `Control` is part of the key - then it
  defaults to `keydown`, because the browser may swallow the keyup.

`NoInput` (`:`) is a per-key flag checked against `INPUT|TEXTAREA|SELECT` targets; `onSystem` is a
per-sequence flag checked against `navigator.platform`.

### Disposal

Three equivalent ways out, all ending in `listeners.splice` + `afterUnwatch()`:
the disposer returned by `watch`, `unwatchAll(ref)` for everything registered under one reference,
or `of(ref)` for a scoped `{ watch, unwatch }` pair. The bottom of `keys.js` registers `tearDown`
as an HMR dispose handler.

### Vue mixin

`src/vue-mixin.js` targets **Vue 2** (`mounted` / `beforeDestroy` / `this.$watch`). It uses the
component instance itself as the `ref`, binds every handler to it, and calls `unwatchAll(this)` in
`beforeDestroy`, so bindings live exactly as long as the component. It calls the internal
`watchSequence` directly, not `watch`.

Passing a **string** to `Mixin(...)` does not mean a key definition - it is the name of a reactive
property or computed that supplies the definitions, and the mixin re-watches on every change of it.
Definitions may also be a `Promise`. `this.$watchKeys(keys, handler)` is available for ad-hoc
bindings from inside a component.
