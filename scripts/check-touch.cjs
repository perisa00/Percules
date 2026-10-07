const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const listeners = new Map();
const scene = { addEventListener(type, handler, options) { listeners.set(type, { handler, options }); } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/touch.js'), 'utf8'), {
  document: { querySelector: () => scene }
});
assert.equal(listeners.get('touchmove').options.passive, false);
assert.equal(listeners.get('touchstart').options.passive, true);
assert.equal(listeners.has('pointermove'), false, 'Pointer rotation/pinch handlers must remain independent');
function event(type, panel, x = 100, y = 100, fingers = 1, cancelable = true) {
  let prevented = false;
  listeners.get(type).handler({
    target: { closest: () => panel }, touches: Array.from({ length: fingers }, () => ({ clientX: x, clientY: y })),
    cancelable, preventDefault() { prevented = true; }
  });
  return prevented;
}
for (const y of [20, 180]) {
  assert.equal(event('touchstart', null), false, 'Do not suppress taps');
  assert.equal(event('touchmove', null, 100, y), true, 'Block viewport pan in both directions');
}
event('touchstart', null, 100, 100, 2);
assert.equal(event('touchmove', null, 120, 80, 2), true, 'Native zoom blocked; app Pointer Events retain pinch');
assert.equal(event('touchmove', null, 100, 100, 1, false), false);
const about = { id: 'about-panel', scrollTop: 30, scrollHeight: 500, clientHeight: 200 };
for (const y of [80, 120]) {
  event('touchstart', about);
  assert.equal(event('touchmove', about, 100, y), false, 'Panel content can scroll in both directions');
}
about.scrollTop = 0; event('touchstart', about);
assert.equal(event('touchmove', about, 100, 120), true, 'No bounce past panel top');
about.scrollTop = 300; event('touchstart', about);
assert.equal(event('touchmove', about, 100, 80), true, 'No bounce past panel bottom');
const nav = { id: 'planet-nav', scrollLeft: 40, scrollWidth: 700, clientWidth: 300 };
event('touchstart', nav);
assert.equal(event('touchmove', nav, 80, 100), false, 'Planet list can scroll horizontally');
event('touchstart', nav);
assert.equal(event('touchmove', nav, 100, 80), true, 'Planet list cannot move the page vertically');
nav.scrollLeft = 0; event('touchstart', nav);
assert.equal(event('touchmove', nav, 120, 100), true, 'No bounce past planet list start');
event('touchcancel', nav, 100, 100, 0);
assert.equal(event('touchmove', nav, 80, 100), true, 'Cancelled gestures do not retain scroll permission');
console.log('Touch checks passed: scene pan/pinch, taps, panel/list scrolling, edge bounce and cancellation.');
