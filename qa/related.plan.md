# Related — test plan

Cases derived from what was agreed in design, not from the implementation.
Executed against the deployed build (canopy), recorded actual vs expected.

| # | Requirement | Case | Expected |
|---|---|---|---|
| A1 | terms | Open FJ on P0AEX9 | Pane lists genKnown's taxon row under heading `P0AEX9` |
| A2 | terms | Open a panel that declares none (Home) | Pane hidden; no rows |
| A3 | links | Press a row | The answering plugin's document opens on the row's params |
| A4 | links | Press a row twice | One tab, focused, not a duplicate |
| A5 | no fetch | Display a pane | Zero requests to any plugin backend |
| A6 | no fetch | Press `+` | Zero requests; item enters the cart |
| A7 | contexts | Cart holds terms the view lacks | Second section, headed 🛒 with a count |
| A8 | contexts | Cart holds only terms the view has | No cart section (deduped) |
| A9 | cap | One plugin answers 5 for a context | 3 rows + "2 more from X" |
| A10 | dismissal | Dismiss a row, then change terms and come back | Row stays gone |
| A11 | accept | Add, then remove the item from the cart | The proposal returns |
| A12 | self | FJ's own view | No FJ row in the view section |
| A13 | block | Fold, resize, reorder, unpin | Behaves as any navigator; survives reload |
| A14 | block | Collapse the sidebar | Rail glyph present and opens a preview |
| A15 | empty | Nothing to say | Block renders nothing, no empty furniture |
| A16 | loading | Answers pending | Says so rather than showing an empty block |
| A17 | failure | A plugin's related() throws | Its rows are absent; other plugins' rows remain |
| A18 | a11y | Keyboard | Rows reachable, Enter opens, focus visible |
| A19 | a11y | Names | Add/dismiss buttons named; block labelled |
| A20 | themes | Light and dark | No token-less colours; text meets AA |
| R1 | regression | Cart tray | Add/remove/preview/clear still work |
| R2 | regression | Composer | Offers, Send row, destination trail unchanged |
| R3 | regression | Tabs & breadcrumbs | Open/close/split, crumb hue |
| R4 | regression | Settings, Home | Both open; tour renders; pin/unpin works |
| R5 | regression | Reload | Layout, cart and pinned blocks restore |
