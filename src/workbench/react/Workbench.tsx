import { useLayout } from './context';
import { FrameLayerProvider } from './FrameLayer';
import { LiveRegion } from './LiveRegion';
import { MainArea } from './MainArea';
import { PromptBar } from './PromptBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { WorkbenchDnd } from './WorkbenchDnd';
import { WorkbenchMenubar } from './WorkbenchMenubar';
import { useFocusSync } from './useFocusSync';
import { useKeybindings } from './useKeybindings';
import styles from './Workbench.module.css';

export function Workbench() {
  const layout = useLayout();
  useKeybindings();
  useFocusSync();
  return (
    <div className={styles.root} data-locked={layout.locked || undefined}>
      <WorkbenchMenubar />
      <WorkbenchDnd>
        <FrameLayerProvider>
          <div className={styles.body}>
            <Sidebar />
            <div className={styles.mainColumn}>
              <MainArea />
              {layout.bars.prompt && <PromptBar />}
            </div>
          </div>
        </FrameLayerProvider>
      </WorkbenchDnd>
      {layout.bars.status && <StatusBar />}
      <LiveRegion />
    </div>
  );
}
