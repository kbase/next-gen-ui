/* Types for pose.js, which is plain JavaScript so the wheel build can assemble
   solara/loader.js from it without a TypeScript compiler. */

/** From the --loader-* custom properties; ms and viewBox units. */
export interface Params {
  tx: number;
  ty: number;
  gain: number;
  lap: number;
  turn: number; // 0: no turn
  enter: number;
  exit: number;
}

/** The angle along the loop, the figure's rotation, the envelope, and the envelope's rate per ms. */
export interface Pose {
  a: number;
  theta: number;
  e: number;
  de: number;
}

export const TAU: number;
export const DEPTH_PHASE: number;
export const RAMP_STEPS: number;
export const DOTS: ReadonlyArray<{ phase: number; rest: number }>;

export function readParams(el: Element): Params;
export function turnRate(p: Params): number;
export function dotTransform(q: Pose, i: number, p: Params): string;
export function turnTransform(q: Pose): string;
export function rampPose(from: Pose, toE: number, duration: number, p: Params, t: number): Pose;
export function cssPose(t: number, p: Params): Pose;
export function exitFrames(from: Pose, p: Params): Pose[];
export function elapsedOf(animations: Iterable<Animation>): number;
