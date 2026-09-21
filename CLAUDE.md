# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm test               # vitest run + the type check
npx vitest run test/keys.spec.js   # a single test file
npx vitest             # watch mode
npm run dist           # rollup (8 bundles) + tsc (declarations)
npm run types:check    # emit the .d.ts and check test/types.test-d.ts against them
```

There is no linter and no dev server. Everything the tests cannot cover is verified by hand in the
browser via the demo pages in `docs/`.

`dist/` is checked into git (not in `.gitignore`) and both demo pages load from it. A change in
`src/` is therefore only visible in the demo after `npm run dist`, and a commit that touches `src/`
usually has to carry the rebuilt `dist/` files with it.

To try a change: `npm run dist`, then open `docs/viewer.html` (shows code/key/short/full for every
key event and lets you test a binding) or `docs/index.html` (guided tutorial). Both are plain files,
`open docs/viewer.html` is enough - no server needed.

## Architecture

An ES-module browser library with **two entry points**, and that split is the load-bearing
decision of the package:

- `index.js` -> `keywatch` - the core. Re-exports `src/keys.js` and depends on nothing.
- `vue.js` -> `keywatch/vue` - the Vue 3 bindings. Re-exports `src/vue.js`, the only module that
  imports from `vue`.

Keeping them apart is what lets the core bundle stay framework-free, which the README advertises.
Anything importing from `vue` therefore belongs in `src/vue.js`, never in the core. `src/lib.js`
holds four trivial helpers. Everything of substance is in `src/keys.js`.

Rollup builds both entries (`esm`/`iife`, each plus a `.min`); the vue entry keeps `vue` external
and maps it to the global `Vue` for the IIFE build, whose global is `KeywatchVue`.

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

### Vue 3 bindings

`src/vue.js` offers both APIs on top of one shared helper, `bindKeys(ref, keys, bindTo)`, which
calls the internal `watchSequence` directly rather than `watch`, and resolves a `Promise`
definition transparently (a disposal before it settles keeps the late definitions from being
registered at all).

- `watchKeys(keys, ref?)` - Composition API. Uses the component instance as the `ref`, disposes via
  `onUnmounted`, and returns the disposer. A `Ref`, `ComputedRef` or getter is treated as a
  **reactive source** and rebound through Vue's own `watch`. Handlers are not bound - there is no
  `this` in `setup`.
- `Mixin(keys?)` - Options API. Binds every handler to the instance and disposes in
  `beforeUnmount`. Passing a **string** does not mean a key definition: it names a reactive
  property or computed supplying them, and the mixin re-binds on every change via `this.$watch`.
  It also adds `$watchKeys(keys, handler)` to the instance, which survives Vue 3 because the public
  instance proxy falls through to `ctx` for non-reserved `$` names.

The hook name is the trap here: Vue 3 silently ignores `beforeDestroy`, so watchers would pile up
across mounts instead of erroring. `test/vue.spec.js` guards that with an explicit
mount/unmount/remount test - keep it.

### Type declarations

The `.d.ts` are generated from JSDoc (`tsconfig.types.json`), so **the JSDoc is the type source**.
Two consequences when editing:

- A malformed or missing comment degrades a signature to `any` instead of failing the build.
  `test/types.test-d.ts` exists to catch exactly that and runs as part of `npm test`.
- JSDoc must stay TypeScript-parseable: use `Object<string, X>` rather than `{ [string]: X }`, give
  every `@param` a name, and prefer a named `@typedef` over a long inline object type.

### Demo pages

Both pages pull Vue 3 and their CSS from jsDelivr with SRI hashes, so changing a CDN version means
recomputing the hash (`curl -s <url> | openssl dgst -sha256 -binary | openssl base64 -A`).

- `docs/index.html` loads both bundles, because it uses the mixin through the global
  `KeywatchVue`. It is the end-to-end check for the string form of `Mixin`.
- `docs/viewer.html` uses Buefy 3 (`b-field`, `b-switch`, `b-input`, `b-button`) and needs
  Bulma 1.x. Vue 3 does not auto-install plugins, and the UMD build exposes the plugin as
  `Buefy.default`, not on the namespace - `app.use(Buefy.default)`.
