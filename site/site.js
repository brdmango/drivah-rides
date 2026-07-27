/* Marketing site behaviour: the fuel-split calculator, scroll reveals, and the
   sticky-nav hairline. No framework — the landing page ships no React. */

import { calcCostShare } from '../src/utils.js'

/* ── Fuel split ─────────────────────────────────────────────
   Deliberately imported from the app's own utils rather than reimplemented,
   so the number quoted on the marketing page cannot drift away from the
   number the app actually charges. */
const GAS_PER_MILE = 0.21   // matches calcCostShare in src/utils.js

const milesEl = document.getElementById('miles')
const milesOut = document.getElementById('miles-out')
const shareEl = document.getElementById('calc-share')
const soloEl = document.getElementById('calc-solo')
const destEl = document.getElementById('calc-dest')
const seatBtns = [...document.querySelectorAll('.seat')]

let seats = 3

// Named for distances a UF student would actually recognise.
const destinationFor = (mi) =>
  mi <= 6  ? 'Butler Plaza'
: mi <= 15 ? 'Gainesville Airport (GNV)'
: mi <= 45 ? 'Ocala'
: mi <= 90 ? 'Jacksonville'
: mi <= 135 ? 'Orlando (MCO)'
:            'Tampa'

function render() {
  const miles = Number(milesEl.value)
  milesOut.textContent = `${miles} mi`
  destEl.textContent = destinationFor(miles)
  shareEl.textContent = `$${calcCostShare(miles, seats)}`
  soloEl.textContent = `$${(miles * GAS_PER_MILE).toFixed(2)}`
}

milesEl.addEventListener('input', render)

seatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    seats = Number(btn.dataset.seats)
    seatBtns.forEach(b => {
      const on = b === btn
      b.classList.toggle('is-on', on)
      b.setAttribute('aria-checked', String(on))
    })
    render()
  })
})

render()

/* ── Scroll reveals ─────────────────────────────────────── */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const targets = document.querySelectorAll('.reveal')

if (reduced || !('IntersectionObserver' in window)) {
  targets.forEach(el => el.classList.add('is-in'))
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return
      e.target.classList.add('is-in')
      io.unobserve(e.target)
    })
  }, { rootMargin: '0px 0px -8% 0px', threshold: .1 })
  targets.forEach(el => io.observe(el))
}

/* ── Sticky nav hairline ────────────────────────────────── */
const nav = document.getElementById('nav')
const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 8)
addEventListener('scroll', onScroll, { passive: true })
onScroll()
