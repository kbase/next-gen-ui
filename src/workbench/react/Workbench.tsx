import { Toast } from '@kbase/design-system';
import { useLayout, useServices } from './context';
import { LiveRegion } from './LiveRegion';
import { MainArea } from './MainArea';
import { PanelLayer } from './PanelLayer';
import { PromptBar } from './PromptBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { WorkbenchDnd } from './WorkbenchDnd';
import { WorkbenchMenubar } from './WorkbenchMenubar';
import { useAmbientQueries } from './useAmbientQueries';
import { useFocusSync } from './useFocusSync';
import { useKeybindings } from './useKeybindings';
import styles from './Workbench.module.css';

export function Workbench() {
  const layout = useLayout();
  const { toasts } = useServices();
  useKeybindings();
  useFocusSync();
  useAmbientQueries();
  return (
    <Toast.Provider manager={toasts}>
      <div className={styles.root} data-locked={layout.locked || undefined}>
        <WorkbenchMenubar />
        <WorkbenchDnd>
          <PanelLayer>
            <div className={styles.body}>
              <Sidebar />
              <div className={styles.mainColumn}>
                <MainArea />
                {layout.bars.prompt && <PromptBar />}
              </div>
            </div>
          </PanelLayer>
        </WorkbenchDnd>
        {layout.bars.status && <StatusBar />}
        <LiveRegion />
        <Toast.Viewport />
      </div>
    </Toast.Provider>
  );
}
