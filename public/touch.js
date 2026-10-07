(() => {
  'use strict';
  const scene = document.querySelector('main');
  if (!scene) return;
  let scrollGesture = null;

  // Safari can move its viewport even when the document has overflow:hidden.
  // Leave Pointer Events in charge of the scene; only cancel native scrolling.
  scene.addEventListener('touchstart', event => {
    scrollGesture = null;
    if (event.touches.length !== 1) return;
    const panel = event.target.closest?.('#about-panel, #planet-nav');
    if (!panel) return;
    const touch = event.touches[0];
    scrollGesture = { panel, x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  scene.addEventListener('touchmove', event => {
    let allowScroll = false;
    if (scrollGesture && event.touches.length === 1) {
      const touch = event.touches[0];
      const { panel, x, y } = scrollGesture;
      const dx = touch.clientX - x, dy = touch.clientY - y;
      scrollGesture.x = touch.clientX;
      scrollGesture.y = touch.clientY;
      const horizontal = panel.id === 'planet-nav';
      const delta = horizontal ? dx : dy;
      const position = horizontal ? panel.scrollLeft : panel.scrollTop;
      const maximum = horizontal ? panel.scrollWidth - panel.clientWidth : panel.scrollHeight - panel.clientHeight;
      const alongPanel = horizontal ? Math.abs(dx) >= Math.abs(dy) : Math.abs(dy) >= Math.abs(dx);
      allowScroll = alongPanel && maximum > 0 &&
        ((delta > 0 && position > 0) || (delta < 0 && position < maximum - 1));
    }
    if (!allowScroll && event.cancelable) event.preventDefault();
  }, { passive: false });

  const release = event => { if (event.touches.length !== 1) scrollGesture = null; };
  scene.addEventListener('touchend', release, { passive: true });
  scene.addEventListener('touchcancel', () => { scrollGesture = null; }, { passive: true });
})();
