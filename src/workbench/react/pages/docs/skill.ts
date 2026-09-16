// The documentation page as a skill file an agent can be handed: the task,
// what the page cannot know (which workbench, which SDK), and the page itself
// as markdown, converted from the rendered article so the two cannot differ.

export interface SkillFacts {
  // The workbench's origin, which the plugin's server must allow.
  origin: string;
  sdkVersion: string;
}

export function skillMarkdown(article: Element, { origin, sdkVersion }: SkillFacts): string {
  return [
    '---',
    'name: kbase-workbench-plugin',
    'description: Build, serve and report a plugin for the KBase workbench. Use when asked to make a workbench app, page, panel or command.',
    '---',
    '',
    '# KBase workbench plugin',
    '',
    '## Task',
    '',
    'Build a workbench plugin that does what the person asked for, serve it, and report where its manifest is.',
    '',
    '1. Follow "Getting started" below: a Vite project with `plugin.config.ts`, `vite.config.ts` and the modules the plugin needs, built with `npm run build`.',
    `2. Serve \`dist/\` as in "Serve", with \`preview: { cors: true }\` so every response carries \`Access-Control-Allow-Origin\` for ${origin}, where the workbench runs. ${where(origin)}`,
    '3. End the final message with the manifest URL on its own last line, exactly in this form:',
    '',
    '```',
    'Manifest: http://127.0.0.1:8899/manifest.json',
    '```',
    '',
    'The person pastes that URL into the workbench, which installs the plugin without a reload. After a rebuild, the person removes the plugin and installs the same URL again.',
    '',
    '## Environment',
    '',
    `- SDK: \`@kbase/plugin-sdk\` ${sdkVersion}, built from a checkout of the workbench repository at that version by \`npm run build:plugin-sdk\` into \`dist-plugin-sdk/\`, which "Create the project" depends on. A plugin built against another version is refused, with the reason shown in the workbench's Settings.`,
    '- The workbench that installs by URL is a development or demo build without a Content-Security-Policy. A production deployment lists plugins in a registry, as "Deployment" describes.',
    '',
    articleToMarkdown(article, 1),
    '',
  ].join('\n');
}

// Where to serve from, given the workbench's origin: a browser on an https
// page loads `http://` only from loopback, and loopback is the person's own
// machine.
function where(origin: string): string {
  return origin.startsWith('https:')
    ? `The workbench is served over https, so serve at \`http://127.0.0.1:<port>\` on the machine the person uses the workbench from; from any other machine the plugin must be served over https, as plain \`http://\` from another host is blocked as mixed content.`
    : `Serve at \`http://127.0.0.1:<port>\`, or at any origin the person's browser can reach.`;
}

// The rendered article as markdown. `demote` moves every heading down that
// many levels, so the page's own `h1` sits under the skill's sections.
export function articleToMarkdown(root: Element, demote = 0): string {
  const blocks: string[] = [];
  const block = (text: string) => {
    if (text.trim()) blocks.push(text.trimEnd());
  };

  const visit = (el: Element) => {
    if (el.hasAttribute('data-skip')) return;
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
        block(`${'#'.repeat(Math.min(6, Number(tag[1]) + demote))} ${inline(el)}`);
        return;
      case 'h5':
      case 'h6':
        block(`**${inline(el)}**`);
        return;
      case 'p':
        block(inline(el));
        return;
      case 'ul':
      case 'ol':
        block(list(el));
        return;
      case 'figcaption':
        block(`\`${inline(el)}\``);
        return;
      case 'pre':
        block(fence(el));
        return;
      case 'table':
        block(table(el));
        return;
      case 'nav':
      case 'button':
      case 'script':
      case 'style':
        return;
      default:
        for (const child of el.children) visit(child);
    }
  };
  visit(root);
  return blocks.join('\n\n');
}

// Text with inline code, bold and italics kept; runs of whitespace, which JSX
// leaves between elements, collapsed to one space.
function inline(node: Node): string {
  return raw(node).replace(/\s+/g, ' ').trim();
}

function raw(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  if (el.hasAttribute('data-skip')) return '';
  const inner = () => [...el.childNodes].map(raw).join('');
  switch (el.tagName.toLowerCase()) {
    case 'code':
      return `\`${el.textContent ?? ''}\``;
    case 'strong':
    case 'b':
      return `**${inner()}**`;
    case 'em':
    case 'i':
      return `*${inner()}*`;
    case 'br':
      return '\n';
    default:
      return inner();
  }
}

function list(el: Element, depth = 0): string {
  const ordered = el.tagName.toLowerCase() === 'ol';
  const indent = '  '.repeat(depth);
  const items: string[] = [];
  let n = 0;
  for (const li of el.children) {
    if (li.tagName.toLowerCase() !== 'li') continue;
    n += 1;
    const marker = ordered ? `${n}.` : '-';
    const own = [...li.childNodes].filter(
      (c) => !(c instanceof Element && ['ul', 'ol'].includes(c.tagName.toLowerCase())),
    );
    const text = own.map(raw).join('').replace(/\s+/g, ' ').trim();
    items.push(`${indent}${marker} ${text}`);
    for (const nested of li.children) {
      if (['ul', 'ol'].includes(nested.tagName.toLowerCase())) items.push(list(nested, depth + 1));
    }
  }
  return items.join('\n');
}

// A fenced block with the language CodeBlock records on the code element.
function fence(pre: Element): string {
  const code = pre.querySelector('code') ?? pre;
  const language = /language-([\w-]+)/.exec(code.className)?.[1] ?? '';
  const text = (code.textContent ?? '').replace(/\n$/, '');
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

function table(el: Element): string {
  const cell = (c: Element) => inline(c).replace(/\|/g, '\\|');
  const rows = [...el.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => cell(c)));
  if (rows.length === 0) return '';
  const [head, ...body] = rows;
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(head), `| ${head.map(() => '---').join(' | ')} |`, ...body.map(line)].join('\n');
}
