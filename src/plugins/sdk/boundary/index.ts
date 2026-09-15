// Every value that crosses between a plugin and the host, defined once.
//
// A type here is `z.infer` of its schema rather than an interface the schema
// is checked against: the schema is the definition, so a field cannot be
// added to one and forgotten in the other. The host parses at the crossing
// (workbench/host/checked.ts) — throwing to the plugin where the plugin's
// call is on the stack, dropping the value with a warning where it is not —
// and the SDK's build writes each schema out as JSON Schema
// (dist-plugin-sdk/schemas), so a plugin that builds one of these in another
// language can test what it builds against the same rule. That is what the
// list below is for: it is the boundary, enumerated.
//
// What is not here: the calls themselves (`Cart`, `PluginHost`,
// `PanelHandle`, the module interfaces), which are how a plugin reaches the
// host rather than what it sends; and the live objects a call carries — an
// `AbortSignal`, a `Cleanup`, an element to draw into — which have no value
// form and stop at this process's edge.

import { CartItemSchema, CartSourceSchema } from './cart';
import {
  MatchKindSchema,
  MatchSchema,
  OfferSchema,
  TermsQuerySchema,
  TermsSchema,
  TypedQuerySchema,
  TypedTextSchema,
} from './background';
import { ArgValuesSchema, CallerSchema } from './commands';
import { NoticeSchema } from './host';
import {
  DeclaredCallSchema,
  DeclaredCommandSchema,
  IntentQuerySchema,
  SuggestionSchema,
  TieredTermsSchema,
} from './intent';
import {
  ArgDeclSchema,
  CommandCallSchema,
  ManifestSchema,
  ModuleSchema,
  PluginConfigSchema,
  SlashCommandSchema,
} from './manifest';
import {
  CrumbSchema,
  CrumbsSchema,
  PanelStateSchema,
  PanelTermsSchema,
  PathSchema,
  TitleSchema,
} from './panel';
import { DestinationSchema, QuerySchema } from './prompt';
import { StatusItemSchema } from './status';

export * from './background';
export * from './cart';
export * from './commands';
export * from './host';
export * from './intent';
export * from './manifest';
export * from './panel';
export * from './prompt';
export * from './status';

// The boundary by name, in the direction it travels. `toPlugin` is what the
// host builds and a plugin reads; `toHost` is what a plugin builds and the
// host checks. The build writes one JSON Schema per entry under the name it
// has here.
export const BOUNDARY = {
  toHost: {
    Manifest: ManifestSchema,
    PluginConfig: PluginConfigSchema,
    SlashCommand: SlashCommandSchema,
    ArgDecl: ArgDeclSchema,
    CommandCall: CommandCallSchema,
    Module: ModuleSchema,
    CartItem: CartItemSchema,
    CartSource: CartSourceSchema,
    Terms: TermsSchema,
    Offer: OfferSchema,
    Match: MatchSchema,
    MatchKind: MatchKindSchema,
    Suggestion: SuggestionSchema,
    StatusItem: StatusItemSchema,
    Destination: DestinationSchema,
    Path: PathSchema,
    Title: TitleSchema,
    Crumbs: CrumbsSchema,
    Crumb: CrumbSchema,
    PanelTerms: PanelTermsSchema,
    ArgValues: ArgValuesSchema,
    Notice: NoticeSchema,
  },
  toPlugin: {
    TypedText: TypedTextSchema,
    TypedQuery: TypedQuerySchema,
    TermsQuery: TermsQuerySchema,
    Query: QuerySchema,
    IntentQuery: IntentQuerySchema,
    TieredTerms: TieredTermsSchema,
    DeclaredCommand: DeclaredCommandSchema,
    DeclaredCall: DeclaredCallSchema,
    PanelState: PanelStateSchema,
    Caller: CallerSchema,
  },
} as const;
