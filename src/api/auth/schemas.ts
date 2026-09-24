import { z } from 'zod';

// Wire-format schemas for the kbase auth service.
// Permissive at the boundary (passthrough unknown fields) but strict on
// the fields we actually consume; consumers get parsed values.

// Inner fields are optional because the reference type (kbase-ui's
// auth.ts) uses Record<string, string> here. We shouldn't 5xx the
// gate over a missing provusername. findOrcid() in account.tsx
// skips entries lacking `provider`.
export const IdentSchema = z
  .object({
    provider: z.string().optional(),
    provusername: z.string().optional(),
    id: z.string().optional(),
  })
  .passthrough();
export type Ident = z.infer<typeof IdentSchema>;

export const MeSchema = z
  .object({
    user: z.string(),
    display: z.string(),
    email: z.string().default(''),
    created: z.number().optional(),
    lastlogin: z.number().optional(),
    idents: z.array(IdentSchema).default([]),
  })
  .passthrough();
export type Me = z.infer<typeof MeSchema>;

// PUT /services/auth/me accepts a partial: each field is optional so
// callers can ship one-field patches and avoid lost-update races on
// concurrent edits. Wire shape only; input rules (non-empty display,
// valid email) live at the form layer.
export const MeUpdateSchema = z.object({
  display: z.string().optional(),
  email: z.string().optional(),
});
export type MeUpdate = z.infer<typeof MeUpdateSchema>;

// Single session/token entry returned by GET /tokens/. Matches the
// shape kbase-ui consumes in features/account/LogInSessions.tsx. `id`
// is the only field strictly required (for revocation); the rest is
// passthrough.
export const SessionTokenSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    user: z.string().optional(),
    created: z.number().optional(),
    expires: z.number().optional(),
    name: z.string().nullable().optional(),
    os: z.string().optional(),
    osver: z.string().optional(),
    agent: z.string().optional(),
    agentver: z.string().optional(),
    device: z.string().optional(),
    ip: z.string().optional(),
    mfa: z.union([z.literal('Used'), z.literal('NotUsed'), z.literal('Unknown')]).optional(),
  })
  .passthrough();
export type SessionToken = z.infer<typeof SessionTokenSchema>;

// Response of GET /services/auth/tokens/. The full kbase-ui shape is
// { current, dev, service, tokens, user, createurl, revokeurl,
//   revokeallurl }; we only consume `current` (the active session) and
// `tokens` (all sessions, including the current one).
export const AllSessionsSchema = z
  .object({
    current: SessionTokenSchema,
    tokens: z.array(SessionTokenSchema).default([]),
  })
  .passthrough();
export type AllSessions = z.infer<typeof AllSessionsSchema>;

export const TokenInfoSchema = z
  .object({
    id: z.string(),
    user: z.string().optional(),
    expires: z.number().optional(),
    created: z.number().optional(),
    type: z.string().optional(),
    name: z.string().nullable().optional(),
    mfa: z.union([z.literal('Used'), z.literal('NotUsed'), z.literal('Unknown')]).optional(),
  })
  .passthrough();
export type TokenInfo = z.infer<typeof TokenInfoSchema>;

export const LoginChoiceLoginEntrySchema = z
  .object({
    id: z.string(),
    user: z.string().optional(),
  })
  .passthrough();

export const LoginChoiceCreateEntrySchema = z
  .object({
    id: z.string().optional(),
  })
  .passthrough();

export const LoginChoiceSchema = z
  .object({
    login: z.array(LoginChoiceLoginEntrySchema).optional(),
    create: z.array(LoginChoiceCreateEntrySchema).optional(),
  })
  .passthrough();
export type LoginChoice = z.infer<typeof LoginChoiceSchema>;

export const LoginPickInputSchema = z.object({
  id: z.string(),
  policyids: z.array(z.string()).default([]),
});
export type LoginPickInput = z.input<typeof LoginPickInputSchema>;

// The auth service returns the bearer token in the response body and
// echoes the `redirecturl` posted at login/start. Other fields vary.
// `expires` is unix milliseconds since epoch (cross-checked against
// kbase-ui's cookie test fixtures, which use 13-digit `Date.now()`-style
// values). cookie.ts's setToken treats the Date built from this as ms;
// if the wire flips to seconds in the future, setToken's clamp throws.
export const LoginPickResultSchema = z
  .object({
    token: z.object({ token: z.string(), expires: z.number().optional() }).passthrough(),
    redirecturl: z.string().nullable().optional(),
  })
  .passthrough();
export type LoginPickResult = z.infer<typeof LoginPickResultSchema>;
