/**
 * In-slide build steps, the deckx equivalent of Keynote builds or reveal.js fragments.
 *
 * Any element inside a slide can opt in with `data-step="N"`: it is hidden until the slide
 * reaches step N. An optional `data-step-end="M"` hides it again once the slide moves past
 * step M, which is how a run of mutually exclusive frames is expressed:
 *
 *     <pre data-step="0" data-step-end="0">first frame</pre>
 *     <pre data-step="1" data-step-end="1">second frame</pre>
 *     <pre data-step="2">third and final frame</pre>
 *
 * A slide's step count is derived from those attributes (the highest step mentioned, plus
 * one), so a slide with no stepped elements has exactly one step. The runtime only writes
 * state: `data-step-state` on every stepped element (`pending` | `active` | `done`) and
 * `data-step` on the slide. `base.css` turns that state into visibility, and a deck's own
 * stylesheet can override it for fades, dimming or anything else.
 *
 * Printing shows every slide at its final step. That state is written once at load into
 * `data-step-print`, so the print stylesheet needs no script to run.
 */

/** Per-element step range, parsed once from the attributes. */
interface SteppedElement {
  el: HTMLElement
  start: number
  end: number
}

/** The visibility state of a stepped element at a given step. */
export type StepState = 'pending' | 'active' | 'done'

/** Step controller for one slide. */
export interface SlideSteps {
  /** Number of steps in the slide, always at least 1. */
  readonly count: number
  /** The step currently shown, `0 .. count - 1`. */
  readonly current: number
  /** Show a step. Out-of-range values are clamped. */
  set(step: number): void
}

/** Parse a non-negative integer attribute, falling back when missing or malformed. */
function parseStep(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function stateAt(item: SteppedElement, step: number): StepState {
  if (step < item.start) return 'pending'
  if (step > item.end) return 'done'
  return 'active'
}

/**
 * Collect the stepped elements of a slide and return a controller for them. The slide is
 * left showing step 0.
 */
export function initSteps(slide: HTMLElement): SlideSteps {
  const items: SteppedElement[] = Array.from(slide.querySelectorAll<HTMLElement>('[data-step]')).map((el) => {
    const start = parseStep(el.dataset.step, 0)
    const end = parseStep(el.dataset.stepEnd, Number.POSITIVE_INFINITY)
    return { el, start, end: Math.max(start, end) }
  })

  let count = 1
  for (const item of items) {
    count = Math.max(count, item.start + 1)
    if (Number.isFinite(item.end)) count = Math.max(count, item.end + 1)
  }
  const last = count - 1

  // Print state is static: every slide prints at its final step.
  for (const item of items) item.el.dataset.stepPrint = stateAt(item, last)

  let current = 0
  const set = (step: number) => {
    current = Math.max(0, Math.min(last, step))
    slide.dataset.step = String(current)
    for (const item of items) item.el.dataset.stepState = stateAt(item, current)
  }
  set(0)

  return {
    count,
    get current() {
      return current
    },
    set,
  }
}
