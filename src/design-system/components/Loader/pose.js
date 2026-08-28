/* Where the loader's three dots are at a given moment.
 *
 * A pose is (a, theta, e): the angle along the figure-eight, the figure's own rotation, and an
 * envelope from 0, the logo row, to 1, the braid. Loader.module.scss generates the enter and the
 * braid as keyframes from the same relations; the exit cannot be keyframes, because it starts from
 * whatever pose the animations hold when it is asked for, and is built at runtime instead.
 *
 * Two runtimes build it. Loader.tsx imports this file. A page with no React gets solara/loader.js,
 * which the wheel build assembles from this file and python/loader_driver.js, so both run the same
 * source.
 *
 * Plain JavaScript with types in pose.d.ts: the wheel build is Python and Dart Sass, and stripping
 * TypeScript would put Node into a pip install.
 *
 * The parameters are not here. Loader.module.scss publishes them as --loader-* custom properties
 * and readParams reads them off the element, so a value changed in the stylesheet reaches both
 * runtimes without either being edited.
 */

export const TAU = 2 * Math.PI;
export const DEPTH_PHASE = Math.PI; // angle along the loop at which a dot is nearest
export const RAMP_STEPS = 24;

// phase along the loop, and rest offset from the figure's center
export const DOTS = [
  { phase: 0, rest: -11 },
  { phase: TAU / 3, rest: 0 },
  { phase: (2 * TAU) / 3, rest: 11 },
];

export function readParams(el) {
  const cs = getComputedStyle(el);
  const n = (key) => parseFloat(cs.getPropertyValue(`--loader-${key}`));
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

export function turnRate(p) {
  return p.turn > 0 ? TAU / p.turn : 0;
}

export function dotTransform(q, i, p) {
  const { phase, rest } = DOTS[i];
  const b = q.a + phase;
  const braidX = p.tx * Math.sin(b) - rest;
  const braidY = p.ty * Math.sin(2 * b);
  // the dot's slot in a screen-space row, seen from a frame turned by theta
  const rowX = rest * Math.cos(q.theta) - rest;
  const rowY = -rest * Math.sin(q.theta);
  const x = q.e * braidX + (1 - q.e) * rowX;
  const y = q.e * braidY + (1 - q.e) * rowY;
  const s = 1 + q.e * p.gain * Math.cos(b + DEPTH_PHASE);
  return `translate(${x}px, ${y}px) scale(${s})`;
}

export function turnTransform(q) {
  return `rotate(${q.theta}rad)`;
}

/* e follows the cubic Hermite from (from.e, from.de) to (toE, rate 0); a runs at the loop's rate;
   the turn rate follows e, so theta gets e's integral. With from.de = 0 this is the stylesheet's
   smoothstep enter. */
export function rampPose(from, toE, duration, p, t) {
  const u = Math.min(Math.max(t / duration, 0), 1);
  const u2 = u * u;
  const u3 = u2 * u;
  const u4 = u3 * u;
  const d = from.de * duration;
  return {
    a: from.a + (TAU / p.lap) * duration * u,
    theta:
      from.theta +
      turnRate(p) *
        duration *
        (from.e * (u4 / 2 - u3 + u) + d * (u4 / 4 - (2 * u3) / 3 + u2 / 2) + toE * (u3 - u4 / 2)),
    e: from.e * (2 * u3 - 3 * u2 + 1) + d * (u3 - 2 * u2 + u) + toE * (3 * u2 - 2 * u3),
    de: (from.e * (6 * u2 - 6 * u) + d * (3 * u2 - 4 * u + 1) + toE * (6 * u - 6 * u2)) / duration,
  };
}

/* The pose t ms after data-active was set, as the stylesheet animates it. */
export function cssPose(t, p) {
  const start = {
    a: -(TAU / p.lap) * p.enter,
    theta: -(turnRate(p) * p.enter) / 2,
    e: 0,
    de: 0,
  };
  if (t < p.enter) return rampPose(start, 1, p.enter, p, t);
  const loop = rampPose(start, 1, p.enter, p, p.enter);
  const s = t - p.enter;
  return { a: loop.a + (TAU / p.lap) * s, theta: loop.theta + turnRate(p) * s, e: 1, de: 0 };
}

/* The exit's frames, from the pose the animations are at to the logo row. */
export function exitFrames(from, p) {
  const out = [];
  for (let j = 0; j <= RAMP_STEPS; j++)
    out.push(rampPose(from, 0, p.exit, p, (p.exit * j) / RAMP_STEPS));
  return out;
}

/* The loop's time. Finished enters hold at their end, so the largest currentTime is the loop's. */
export function elapsedOf(animations) {
  let elapsed = 0;
  for (const a of animations) elapsed = Math.max(elapsed, Number(a.currentTime || 0));
  return elapsed;
}
