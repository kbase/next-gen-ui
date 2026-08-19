import { useMemo, Fragment, type ReactNode } from 'react';
import Prism from 'prismjs';
import type { Token } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import { Code } from '@phosphor-icons/react';
import * as Accordion from '../Accordion';
import { cx } from '../../util/cx';
import styles from './CodeBlock.module.scss';

export type CodeBlockLanguage = 'python' | 'typescript' | 'jsx' | 'tsx';

export interface CodeBlockProps {
  code: string;
  language: CodeBlockLanguage;
  /** When true (default), wraps the snippet in a collapsible accordion. */
  collapsible?: boolean;
  /** Trigger label when collapsible. Defaults to "Show code". */
  title?: string;
  className?: string;
}

type PrismNode = string | Token | Array<string | Token>;

function renderNode(node: PrismNode): ReactNode {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    return node.map((n, i) => <Fragment key={i}>{renderNode(n)}</Fragment>);
  }
  const aliases = Array.isArray(node.alias) ? node.alias.join(' ') : (node.alias ?? '');
  const cls = `token ${node.type}${aliases ? ` ${aliases}` : ''}`;
  return <span className={cls}>{renderNode(node.content as PrismNode)}</span>;
}

export function CodeBlock({
  code,
  language,
  collapsible = true,
  title = 'Show code',
  className,
}: CodeBlockProps) {
  // Tokenize and render as JSX rather than calling Prism.highlightElement
  // on a ref'd <code>: the parent Collapsible re-renders on every open/close
  // cycle, and React would reconcile the {code} text child back over Prism's
  // injected spans.
  const tokens = useMemo(() => {
    const grammar = Prism.languages[language];
    if (!grammar) {
      if (import.meta.env.DEV) {
        console.warn(
          `[CodeBlock] no Prism grammar registered for "${language}"; rendering unhighlighted.`,
        );
      }
      return [code];
    }
    return Prism.tokenize(code, grammar);
  }, [code, language]);

  const pre = (
    <pre className={cx(`language-${language}`, !collapsible && className)}>
      <code className={`language-${language}`}>{renderNode(tokens)}</code>
    </pre>
  );

  if (!collapsible) return pre;

  return (
    <div className={cx(styles.card, className)}>
      <Accordion.Root>
        <Accordion.Item
          title={<span className="caption">{title}</span>}
          icon={<Code size={14} weight="bold" />}
        >
          <div className={styles.codeSection}>{pre}</div>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
