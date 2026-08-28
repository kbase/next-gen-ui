import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import styles from './Loader.module.scss';
import { cssPose, dotTransform, elapsedOf, exitFrames, readParams, turnTransform } from './pose.js';
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
   rewound.

   The pose math is in pose.js, which solara/loader.js is also assembled from,
   so this and a page with no React settle a loader the same way. */

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
    const p = readParams(svg.parentElement ?? svg);
    const frames = exitFrames(cssPose(elapsedOf(css), p), p);
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
