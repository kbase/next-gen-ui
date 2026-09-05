import type { Node } from '../core';
import { useDispatch, useLayout } from './context';
import { SplitView } from './SplitView';
import { TabGroup } from './TabGroup';
import styles from './Workbench.module.css';

export function MainArea() {
  const layout = useLayout();
  return (
    <div className={styles.main} role="region" aria-label="Main area">
      <NodeView node={layout.main} />
    </div>
  );
}

function NodeView({ node }: { node: Node }) {
  const dispatch = useDispatch();
  if (node.kind === 'group') return <TabGroup group={node} />;
  return (
    <SplitView
      dir={node.dir}
      sizes={node.sizes}
      onSizes={(sizes) => dispatch({ type: 'resize', split: node.id, sizes })}
      label="panels"
    >
      {node.children.map((child) => (
        <NodeView key={child.id} node={child} />
      ))}
    </SplitView>
  );
}
