import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { Mixin, watchKeys } from '../vue.js'

function press (code, options = {}) {
  const { type = 'keyup', key = code, ...modifiers } = options
  document.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, ...modifiers }))
}

const render = () => h('div')

describe('Mixin', () => {
  it('watches while the component is mounted', () => {
    const reaction = vi.fn()
    const wrapper = mount(defineComponent({
      mixins: [Mixin({ KeyA: reaction })],
      render,
    }))

    press('KeyA')

    expect(reaction).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('disposes its watchers on unmount', () => {
    const reaction = vi.fn()
    const wrapper = mount(defineComponent({
      mixins: [Mixin({ KeyA: reaction })],
      render,
    }))

    wrapper.unmount()
    press('KeyA')

    expect(reaction).not.toHaveBeenCalled()
  })

  it('does not accumulate watchers over repeated mounts', () => {
    const reaction = vi.fn()
    const component = defineComponent({
      mixins: [Mixin({ KeyA: reaction })],
      render,
    })

    for (let i = 0; i < 3; i++) {
      mount(component).unmount()
    }

    const wrapper = mount(component)
    press('KeyA')
    wrapper.unmount()

    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('calls the handler with the component as this', () => {
    const seen = []
    const wrapper = mount(defineComponent({
      mixins: [Mixin({
        KeyA () { seen.push(this.marker) },
      })],
      data: () => ({ marker: 'the-instance' }),
      render,
    }))

    press('KeyA')
    wrapper.unmount()

    expect(seen).toEqual(['the-instance'])
  })

  it('takes a property name and rebinds when that property changes', async () => {
    const reaction = vi.fn()
    const wrapper = mount(defineComponent({
      mixins: [Mixin('keys')],
      data: () => ({ useSecondary: false }),
      computed: {
        keys () {
          return this.useSecondary ? { KeyB: reaction } : { KeyA: reaction }
        },
      },
      render,
    }))

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)

    wrapper.vm.useSecondary = true
    await nextTick()

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)

    press('KeyB')
    expect(reaction).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('provides $watchKeys on the instance', () => {
    const reaction = vi.fn()
    const wrapper = mount(defineComponent({
      mixins: [Mixin()],
      mounted () {
        this.$watchKeys('KeyA', reaction)
      },
      render,
    }))

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)
  })
})

describe('watchKeys', () => {
  it('watches while the component is mounted and disposes on unmount', () => {
    const reaction = vi.fn()
    const wrapper = mount(defineComponent({
      setup () {
        watchKeys({ KeyA: reaction })
        return render
      },
    }))

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('rebinds when a ref source changes', async () => {
    const reaction = vi.fn()
    const keys = ref({ KeyA: reaction })
    const wrapper = mount(defineComponent({
      setup () {
        watchKeys(keys)
        return render
      },
    }))

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)

    keys.value = { KeyB: reaction }
    await nextTick()

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)

    press('KeyB')
    expect(reaction).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('follows a computed getter', async () => {
    const reaction = vi.fn()
    const useSecondary = ref(false)
    const keys = computed(() => (useSecondary.value ? { KeyB: reaction } : { KeyA: reaction }))
    const wrapper = mount(defineComponent({
      setup () {
        watchKeys(keys)
        return render
      },
    }))

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)

    useSecondary.value = true
    await nextTick()

    press('KeyB')
    expect(reaction).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('works outside of a component through its disposer', () => {
    const reaction = vi.fn()
    const dispose = watchKeys({ KeyA: reaction })

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)

    dispose()
    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('resolves a promised definition', async () => {
    const reaction = vi.fn()
    const dispose = watchKeys(Promise.resolve({ KeyA: reaction }))

    await nextTick()
    press('KeyA')

    expect(reaction).toHaveBeenCalledTimes(1)
    dispose()
  })
})
