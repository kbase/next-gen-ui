/* Loader's exit, driven from an attribute, for a consumer with no React.
 *
 * The braid starts in CSS: data-active on .kb-loader--loader plays the enter, which ramps an
 * envelope from the logo row out into the braid. The exit needs the pose the animations hold at the
 * instant it is asked for, so Loader.module.scss declares the exit's duration and no keyframes for
 * it. Loader.tsx builds the exit in React; this builds it for a document with none. Both take the
 * math from components/Loader/pose.js, which gen_loader_js.py joins to this file during the wheel
 * build as solara/loader.js. This file is a build input and is not shipped.
 *
 * Contract: data-loading on a loader or on any ancestor, set to "false" when the work ends.
 * Presence hands the loader to this file; the value is the state. A loader with no data-loading
 * above it is never touched.
 *
 * data-active is held until the exit finishes. The exit's frames compose over the braid's, so the
 * braid is not seen while the exit runs; it is rewound to the row and paused at the end, which is
 * where the next enter plays from.
 *
 * Running the assembled script a second time disconnects the first observer.
 */

import {
  cssPose,
  dotTransform,
  elapsedOf,
  exitFrames,
  readParams,
  turnTransform,
} from '../components/Loader/pose.js';

const OFF = { false: 1, 0: 1, off: 1, no: 1 };
const settling = new WeakMap();
let queued = false;
let observer = null;

function stop(svg) {
  const p = readParams(svg.parentElement || svg);
  const css = svg.getAnimations({ subtree: true }).filter((a) => 'animationName' in a);
  const frames = exitFrames(cssPose(elapsedOf(css), p), p);
  // Pinned to the timeline so it continues from the pose just read; a new animation would
  // otherwise hold its first frame until the next frame.
  const run = (el, key) => {
    const anim = el.animate(frames.map(key), { duration: p.exit, fill: 'forwards' });
    anim.startTime = document.timeline.currentTime;
    return anim;
  };
  const anims = Array.prototype.map.call(svg.querySelectorAll('circle'), (el, i) =>
    run(el, (q) => ({ transform: dotTransform(q, i, p) })),
  );
  anims.push(run(svg, (q) => ({ transform: turnTransform(q) })));
  settling.set(svg, anims);
  anims[0].finished.then(
    () => {
      // Pause and rewind the braid before cancelling the exit. Cancelled first, the braid is still
      // at its own pose and paints one frame of it.
      svg.removeAttribute('data-active');
      css.forEach((a) => {
        a.currentTime = 0;
      });
      anims.forEach((a) => a.cancel());
      settling.delete(svg);
      sync();
    },
    () => settling.delete(svg),
  );
}

function sync() {
  for (const svg of document.querySelectorAll('.kb-loader--loader')) {
    if (settling.has(svg)) continue; // stop() calls sync() again when the exit lands
    // Nothing above it carries data-loading, so the page never handed this loader over and its
    // state is not this file's to set. A loader a page renders active and leaves active is the
    // case this protects.
    const flag = svg.closest('[data-loading]');
    if (!flag) continue;
    const span = svg.parentElement;
    const want = !OFF[flag.getAttribute('data-loading').trim().toLowerCase()];
    if (want && !svg.hasAttribute('data-active')) {
      svg.setAttribute('data-active', '');
      if (span && span.dataset.label) {
        span.setAttribute('role', 'status');
        span.setAttribute('aria-label', span.dataset.label);
      }
    } else if (!want && svg.hasAttribute('data-active')) {
      if (span) span.removeAttribute('aria-label');
      stop(svg);
    }
  }
}

// Loaders and flags appear and change on the host framework's render schedule, at no time this
// file can know. Every mutation triggers a pass, coalesced to one per frame; a pass is two
// selector lookups per loader.
if (observer) observer.disconnect();
observer = new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    sync();
  });
});
observer.observe(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['data-loading'],
});
window.kbaseLoader = { sync };
sync();
