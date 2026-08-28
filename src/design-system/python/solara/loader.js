/* Loader's stop, for a page that has no React.

   Starting the braid is CSS: setting data-active on .kb-loader--loader plays
   the enter, which ramps an envelope from the logo row into the braid.
   Stopping needs the pose at that instant, which only exists at runtime, so
   Loader.module.scss leaves it to the component. This is that half of
   Loader.tsx, with the same pose math, reading the same --loader-* custom
   properties. A change to either has to be made in all three.

   The contract: put data-loading on the loader or on any ancestor -- a form, a
   panel, a page header -- and set it to "false" when the work is done. The
   attribute's presence is what hands a loader to this script; its value is the
   state. A loader with no data-loading above it is left alone, so a page can
   still have one that simply runs while it is on screen.

   This script drives data-active underneath, holding it set until the settle
   has finished, because script animations compose over CSS ones and the loop
   underneath is inert until it is rewound.

   Loading this twice is harmless; the second call replaces the first. */
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
        // Pause and rewind the braid before dropping the settle, or it shows for a frame.
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
      if (settling.has(svg)) continue; // the settle calls sync() again when it lands
      // The attribute's presence is what puts a loader under this script; its value is the state.
      // A loader with no data-loading anywhere above it is one a page means to run for as long as
      // it is on screen, and is left exactly as it was rendered -- reading absence as "off" would
      // stop every always-on loader on the page the moment this script loaded.
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

  // A page re-renders on its own schedule, so the loaders and the flag are
  // watched for rather than waited on. One rAF-coalesced pass per burst.
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
