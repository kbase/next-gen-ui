// Prints the plugin docs page as the sequence a reader meets: headings, code
// blocks, and one sentence per line, in document order. Used to feed a
// progressive reader one unit at a time.
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/workbench/host/docs/Docs.tsx', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('<article'), src.indexOf('</article>'));

const inline = (s) =>
  s
    .replace(/\{' '\}/g, ' ')
    .replace(/\{"([^"]*)"\}/g, '$1')
    .replace(/\{'([^']*)'\}/g, '$1')
    .replace(/<Code>([\s\S]*?)<\/Code>/g, (_, c) => '`' + c.replace(/\s+/g, ' ').trim() + '`')
    .replace(/<em>([\s\S]*?)<\/em>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const sentences = (text) =>
  text.split(/(?<=[.!?])\s+(?=[A-Z`"(\/<])/).map((s) => s.trim()).filter(Boolean);

const units = [];
const re =
  /<h1[^>]*>([^<]*)<\/h1>|<Part id="[^"]*" title="([^"]*)">|<Section id="[^"]*" title="([^"]*)">|<Entry\s+id="[^"]*"\s+name="([^"]*)"\s+when="([^"]*)"|<Export\s+id="[^"]*"\s+name="([^"]*)"\s+when="([^"]*)"|<File\s+name="([^"]*)"\s+language="[^"]*"\s*>\{`([\s\S]*?)`\}<\/File>|<Sig>\{`([\s\S]*?)`\}<\/Sig>|<p className=\{styles\.(?:para|lede)\}>([\s\S]*?)<\/p>|<Symptom name="([^"]*)">([\s\S]*?)<\/Symptom>/g;
let m;
while ((m = re.exec(body))) {
  if (m[1]) units.push(`# ${m[1]}`);
  else if (m[2]) units.push(`## ${m[2]}`);
  else if (m[3]) units.push(`### ${m[3]}`);
  else if (m[4]) units.push(`### ${m[4]}`, `(${m[5]})`);
  else if (m[6]) units.push(`#### ${m[6]}`, `(${m[7]})`);
  else if (m[9] !== undefined) units.push(`[code${m[8] ? ` ${m[8]}` : ''}]\n${m[9].replace(/\\`/g, '`').replace(/\\\$/g, '$')}`);
  else if (m[10]) units.push(`[signature]\n${m[10]}`);
  else if (m[11]) units.push(...sentences(inline(m[11])));
  else if (m[12]) units.push(`#### ${m[12]}`, ...sentences(inline(m[13])));
}

console.log(JSON.stringify(units, null, 2));
