/* Loader's exit, for a consumer with no React.

   The braid starts in CSS: data-active on .kb-loader--loader plays the enter,
   which ramps an envelope from the logo row out into the braid. The exit needs
   the pose the animations hold at the instant it is asked for, which is known
   only at runtime, so Loader.module.scss declares the exit's duration and no
   keyframes for it. Loader.tsx builds the exit from that duration and the
   --loader-* custom properties; this file builds the same one. The pose math
   is in all three, and a change to any of them belongs in the others.

   Contract: data-loading on a loader or on any ancestor, set to "false" when
   the work ends. Presence hands the loader to this file; the value is the
   state. A loader with no data-loading above it is never touched.

   data-active is held until the exit finishes. The exit's frames compose over
   the braid's, so the braid is not seen while the exit runs; it is rewound to
   the row and paused at the end, which is where the next enter plays from.

   Running this file a second time disconnects the first observer. */
(function () {
  var TAU = 2 * Math.PI,
    DEPTH_PHASE = Math.PI,
    RAMP = 24;
  var DOTS = [
    { phase: 0, rest: -11 },
    { phase: TAU / 3, rest: 0 },
    { phase: (2 * TAU) / 3, rest: 11 },
  ];
  var settling = new WeakMap(),
    queued = false,
    observer = null;

  function params(el) {
    var cs = getComputedStyle(el);
    function n(k) {
      return parseFloat(cs.getPropertyValue('--loader-' + k));
    }
    return {
      tx: n('tx'),
      ty: n('ty'),
      gain: n('gain'),
      lap: n('lap'),
      turn: n('turn'),
      enter: n('enter'),
      exit: n('exit'),
    };
  }
  function turnRate(p) {
    return p.turn > 0 ? TAU / p.turn : 0;
  }

  function dotTransform(q, i, p) {
    var d = DOTS[i],
      b = q.a + d.phase;
    var bx = p.tx * Math.sin(b) - d.rest,
      by = p.ty * Math.sin(2 * b);
    // the dot's slot in a screen-space row, seen from a frame turned by theta
    var rx = d.rest * Math.cos(q.theta) - d.rest,
      ry = -d.rest * Math.sin(q.theta);
    var x = q.e * bx + (1 - q.e) * rx,
      y = q.e * by + (1 - q.e) * ry;
    return (
      'translate(' +
      x +
      'px, ' +
      y +
      'px) scale(' +
      (1 + q.e * p.gain * Math.cos(b + DEPTH_PHASE)) +
      ')'
    );
  }

  /* e follows the cubic Hermite from (from.e, from.de) to (toE, rate 0); a runs
     at the loop's rate; the turn rate follows e, so theta gets e's integral. */
  function ramp(from, toE, dur, p, t) {
    var u = Math.min(Math.max(t / dur, 0), 1),
      u2 = u * u,
      u3 = u2 * u,
      u4 = u3 * u;
    var d = from.de * dur;
    return {
      a: from.a + (TAU / p.lap) * dur * u,
      theta:
        from.theta +
        turnRate(p) *
          dur *
          (from.e * (u4 / 2 - u3 + u) + d * (u4 / 4 - (2 * u3) / 3 + u2 / 2) + toE * (u3 - u4 / 2)),
      e: from.e * (2 * u3 - 3 * u2 + 1) + d * (u3 - 2 * u2 + u) + toE * (3 * u2 - 2 * u3),
      de: (from.e * (6 * u2 - 6 * u) + d * (3 * u2 - 4 * u + 1) + toE * (6 * u - 6 * u2)) / dur,
    };
  }

  /* The pose t ms after data-active was set, as the stylesheet animates it. */
  function cssPose(t, p) {
    var start = { a: -(TAU / p.lap) * p.enter, theta: -(turnRate(p) * p.enter) / 2, e: 0, de: 0 };
    if (t < p.enter) return ramp(start, 1, p.enter, p, t);
    var loop = ramp(start, 1, p.enter, p, p.enter),
      s = t - p.enter;
    return { a: loop.a + (TAU / p.lap) * s, theta: loop.theta + turnRate(p) * s, e: 1, de: 0 };
  }

  function stop(svg) {
    var p = params(svg.parentElement || svg);
    var css = svg.getAnimations({ subtree: true }).filter(function (a) {
      return 'animationName' in a;
    });
    var elapsed = 0; // the loop's time; finished enters hold at their end
    css.forEach(function (a) {
      elapsed = Math.max(elapsed, Number(a.currentTime || 0));
    });
    var from = cssPose(elapsed, p),
      frames = [];
    for (var j = 0; j <= RAMP; j++) frames.push(ramp(from, 0, p.exit, p, (p.exit * j) / RAMP));
    // Pinned to the timeline so it continues from the pose just read; a new
    // animation would otherwise hold its first frame until the next frame.
    function run(el, key) {
      var an = el.animate(frames.map(key), { duration: p.exit, fill: 'forwards' });
      an.startTime = document.timeline.currentTime;
      return an;
    }
    var anims = Array.prototype.map.call(svg.querySelectorAll('circle'), function (el, i) {
      return run(el, function (q) {
        return { transform: dotTransform(q, i, p) };
      });
    });
    anims.push(
      run(svg, function (q) {
        return { transform: 'rotate(' + q.theta + 'rad)' };
      }),
    );
    settling.set(svg, anims);
    anims[0].finished.then(
      function () {
        // Pause and rewind the braid before cancelling the exit. Cancelled first, the braid is
        // still at its own pose and paints one frame of it.
        svg.removeAttribute('data-active');
        css.forEach(function (a) {
          a.currentTime = 0;
        });
        anims.forEach(function (a) {
          a.cancel();
        });
        settling.delete(svg);
        sync();
      },
      function () {
        settling.delete(svg);
      },
    );
  }

  var OFF = { false: 1, 0: 1, off: 1, no: 1 };

  function sync() {
    var all = document.querySelectorAll('.kb-loader--loader');
    for (var i = 0; i < all.length; i++) {
      var svg = all[i];
      if (settling.has(svg)) continue; // stop() calls sync() again when the exit lands
      // Nothing above it carries data-loading, so the page never handed this loader over and its
      // state is not this file's to set. A loader a page renders active and leaves active is the
      // case this protects.
      var flag = svg.closest('[data-loading]');
      if (!flag) continue;
      var span = svg.parentElement;
      var want = !OFF[flag.getAttribute('data-loading').trim().toLowerCase()];
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

  // Loaders and flags appear and change on the host framework's render
  // schedule, at no time this file can know. Every mutation triggers a pass,
  // coalesced to one per frame; a pass is two selector lookups per loader.
  if (observer) observer.disconnect();
  observer = new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
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
  window.kbaseLoader = { sync: sync };
  sync();
})();
