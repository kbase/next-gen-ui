import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import styles from './Loader.module.scss';
import { useInView } from '../../util/useInView';
import { cx } from '../../util/cx';

/* The braid and its start are CSS animations (Loader.module.scss) that
   `data-active` plays and pauses, so they run without JS. Stopping needs the
   pose at that instant, so it is done here: the CSS animations' currentTime
   gives the pose, and a one-shot Web Animation settles the dots into a row
   in screen space inside the turned frame; the frame never unwinds. That row
   and the CSS animations' first frame are the same pixels, so the settle
   ends by rewinding them to 0, paused, and the next start plays from there.

   `data-active` stays set until the settle has finished: script animations
   compose over CSS ones, so the loop underneath is inert until it is
   rewound. */

/* From the --loader-* custom properties; ms and viewBox units. */
interface Params {
  tx: number;
  ty: number;
  gain: number;
  lap: number;
  turn: number; // 0: no turn
  enter: number;
  exit: number;
}

const DEPTH_PHASE = Math.PI; // angle along the loop at which a dot is nearest
const RAMP_STEPS = 24;
const TAU = 2 * Math.PI;

// phase along the loop and rest offset from the figure's center
const DOTS = [
  { phase: 0, rest: -11 },
  { phase: TAU / 3, rest: 0 },
  { phase: (2 * TAU) / 3, rest: 11 },
];

interface Pose {
  a: number;
  theta: number;
  e: number;
  de: number; // rate of e, per ms
}

function readParams(el: Element): Params {
  const cs = getComputedStyle(el);
  const n = (key: string) => parseFloat(cs.getPropertyValue(`--loader-${key}`));
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

const turnRate = (p: Params) => (p.turn > 0 ? TAU / p.turn : 0);

function dotTransform({ a, theta, e }: Pose, i: number, p: Params): string {
  const { phase, rest } = DOTS[i];
  const b = a + phase;
  const braidX = p.tx * Math.sin(b) - rest;
  const braidY = p.ty * Math.sin(2 * b);
  // the dot's slot in a screen-space row, seen from a frame turned by theta
  const rowX = rest * Math.cos(theta) - rest;
  const rowY = -rest * Math.sin(theta);
  const x = e * braidX + (1 - e) * rowX;
  const y = e * braidY + (1 - e) * rowY;
  const s = 1 + e * p.gain * Math.cos(b + DEPTH_PHASE);
  return `translate(${x}px, ${y}px) scale(${s})`;
}

const turnTransform = ({ theta }: Pose) => `rotate(${theta}rad)`;

/* e follows the cubic Hermite from (from.e, from.de) to (toE, rate 0); a runs
   at the loop's rate; the turn rate follows e, so theta gets e's integral.
   With from.de = 0 this is the stylesheet's smoothstep enter. */
function rampPose(from: Pose, toE: number, duration: number, p: Params, t: number): Pose {
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

/* The pose t ms after `data-active` was set, as the stylesheet animates it. */
function cssPose(t: number, p: Params): Pose {
  const start: Pose = {
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

interface Settle {
  anims: Animation[];
  done: Promise<void>;
}

export interface LoaderProps {
  /** Rendered width/height in px */
  size?: number;
  /** Whether the braid runs. Off, the loader is the static mini-logo; turning
   *  it on braids the dots out of the logo row, turning it off settles them
   *  back from wherever they are. */
  active?: boolean;
  /** Apply an SVG filter (e.g. "url(#deutan)" for CVD simulation) */
  svgFilter?: string;
  /** Accessible label. When set, the wrapping element gets role="status",
   *  labelled while active, so screen readers announce loading. */
  label?: string;
  className?: string;
}

export function Loader({ size = 48, active = true, svgFilter, label, className }: LoaderProps) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const inViewRef = useRef(inView);
  useLayoutEffect(() => {
    inViewRef.current = inView;
  }, [inView]);
  const svgRef = useRef<SVGSVGElement>(null);
  // Follows `active`, except that on the way off it waits for the settle.
  const [shown, setShown] = useState(active);
  const settle = useRef<Settle | null>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof svg.animate !== 'function') {
      setShown(active);
      return;
    }
    const dots = [...svg.querySelectorAll('circle')];

    if (active) {
      let cancelled = false;
      const begin = () => {
        if (!cancelled) setShown(true);
      };
      if (settle.current) void settle.current.done.then(begin);
      else begin();
      return () => {
        cancelled = true;
      };
    }

    if (settle.current || !svg.hasAttribute('data-active')) return;
    const css = svg.getAnimations({ subtree: true }).filter((a) => 'animationName' in a);
    // The loop's time; the finished enters hold at their end.
    const elapsed = Math.max(0, ...css.map((a) => Number(a.currentTime ?? 0)));
    const p = readParams(svg.parentElement ?? svg);
    const from = cssPose(elapsed, p);
    const poseAt = (t: number) => rampPose(from, 0, p.exit, p, t);
    const frames = Array.from({ length: RAMP_STEPS + 1 }, (_, j) =>
      poseAt((p.exit * j) / RAMP_STEPS),
    );
    // Pinned to the timeline so it continues from the pose just read; a new
    // animation would otherwise hold its first frame until the next frame.
    const animate = (el: Element, keyframes: Keyframe[]) => {
      const anim = el.animate(keyframes, { duration: p.exit, fill: 'forwards' });
      anim.startTime = document.timeline.currentTime;
      if (!inViewRef.current) anim.pause();
      return anim;
    };
    const anims = dots.map((el, i) =>
      animate(
        el,
        frames.map((q) => ({ transform: dotTransform(q, i, p) })),
      ),
    );
    anims.push(
      animate(
        svg,
        frames.map((q) => ({ transform: turnTransform(q) })),
      ),
    );
    const done = anims[0].finished.then(
      () => {
        // Pause and rewind the CSS animations before dropping the settle, or
        // the loop underneath shows for a frame.
        flushSync(() => setShown(false));
        css.forEach((a) => {
          a.currentTime = 0;
        });
        anims.forEach((a) => a.cancel());
        settle.current = null;
      },
      () => {},
    );
    settle.current = { anims, done };
  }, [active]);

  useEffect(() => {
    settle.current?.anims.forEach((a) => {
      if (inView && a.playState === 'paused') a.play();
      else if (!inView && a.playState === 'running') a.pause();
    });
  }, [inView]);

  useEffect(
    () => () => {
      settle.current?.anims.forEach((a) => a.cancel());
      settle.current = null;
    },
    [],
  );

  return (
    <span
      ref={ref}
      className={cx(styles.root, className)}
      data-paused={inView ? undefined : ''}
      role={label ? 'status' : undefined}
      aria-label={active ? label : undefined}
    >
      <svg
        ref={svgRef}
        className={styles.loader}
        viewBox="0 0 48 48"
        width={size}
        height={size}
        aria-hidden="true"
        filter={svgFilter}
        data-active={shown ? '' : undefined}
      >
        <circle cx="13" cy="24" r="9" />
        <circle cx="24" cy="24" r="9" />
        <circle cx="35" cy="24" r="9" />
      </svg>
    </span>
  );
}
