import { describe, expect, it } from 'vitest';
import { articleToMarkdown, skillMarkdown } from './skill';

function article(html: string): Element {
  const el = document.createElement('article');
  el.innerHTML = html;
  return el;
}

describe('the article as markdown', () => {
  it('turns each kind of element the page uses into its markdown', () => {
    const md = articleToMarkdown(
      article(`
        <header><h1>Docs</h1><button data-skip>Try</button></header>
        <nav><button>Rail</button></nav>
        <section>
          <h2>Part</h2>
          <p>A <code>route</code> is <strong>one</strong>   page.</p>
          <h3>Entry</h3>
          <h4>Member</h4>
          <h5>Parameters</h5>
          <table>
            <thead><tr><th>Name</th><th>Type</th></tr></thead>
            <tbody><tr><td>q<span>*</span></td><td><code>a | b</code></td></tr></tbody>
          </table>
          <figure>
            <figcaption>src/route.tsx</figcaption>
            <pre class="language-tsx"><code class="language-tsx"><span class="token">export</span> default x;
</code></pre>
          </figure>
          <ul><li>first</li><li>second<ul><li>nested</li></ul></li></ul>
          <ol><li>one</li><li>two</li></ol>
        </section>
      `),
    );
    expect(md).toBe(
      [
        '# Docs',
        '## Part',
        'A `route` is **one** page.',
        '### Entry',
        '#### Member',
        '**Parameters**',
        '| Name | Type |\n| --- | --- |\n| q* | `a \\| b` |',
        '`src/route.tsx`',
        '```tsx\nexport default x;\n```',
        '- first\n- second\n  - nested',
        '1. one\n2. two',
      ].join('\n\n'),
    );
  });

  it('demotes headings by the level asked for', () => {
    expect(articleToMarkdown(article('<h1>Docs</h1><h4>Deep</h4>'), 1)).toBe(
      '## Docs\n\n##### Deep',
    );
  });
});

describe('the skill', () => {
  it('opens with the frontmatter, names the origin and the SDK, and ends with the page', () => {
    const md = skillMarkdown(article('<h1>Docs</h1><p>Body.</p>'), {
      origin: 'http://wb.test:3000',
      sdkVersion: '0.4.0',
    });
    expect(md.startsWith('---\nname: kbase-workbench-plugin\n')).toBe(true);
    expect(md).toContain('Access-Control-Allow-Origin: http://wb.test:3000');
    expect(md).toContain('`@kbase/plugin-sdk` 0.4.0');
    expect(md).toContain('Manifest: http://');
    expect(md.trimEnd().endsWith('## Documentation\n\n## Docs\n\nBody.')).toBe(true);
  });
});
