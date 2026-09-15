// Writes the boundary out as JSON Schema, one document per value that
// crosses between a plugin and the host (src/plugins/sdk/boundary).
//
// A plugin half written in another language builds these shapes where the SDK
// cannot type-check it — Function Junction and Diaspora build their cart
// items in Python and carry them over postMessage — so the rule has to leave
// TypeScript to be testable there. These files are the rule, in the one form
// every language can read: `jsonschema.validate(item, CartItem.json)` in a
// plugin's own test suite fails when the plugin's ref is bumped past a
// change, which is the moment worth failing at.
//
// `io: 'input'` because these describe what is sent, not what a parse
// returns: a schema with a default or a transform accepts less on the way in
// than it hands back, and what a plugin has to satisfy is the way in.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export function emitSchemas(distRoot, boundary, version) {
  const dir = join(distRoot, 'schemas');
  mkdirSync(dir, { recursive: true });
  const written = { sdkVersion: version, toHost: [], toPlugin: [] };
  for (const [direction, group] of Object.entries(boundary)) {
    for (const [name, schema] of Object.entries(group)) {
      const json = z.toJSONSchema(schema, {
        target: 'draft-2020-12',
        io: 'input',
        // A callback field — `Destination.select` — has no JSON form. It is
        // left as "anything" rather than dropped, so a document that carries
        // one is not refused by the schema for carrying it.
        unrepresentable: 'any',
      });
      writeFileSync(join(dir, `${name}.json`), JSON.stringify({ title: name, ...json }, null, 2) + '\n');
      written[direction].push(name);
    }
  }
  writeFileSync(join(dir, 'index.json'), JSON.stringify(written, null, 2) + '\n');
  return written;
}
