import { createFileRoute } from '@tanstack/react-router';
import { Toast } from '@kbase/design-system';

import { Showcase } from '@kbase/design-system/Showcase';

export const Route = createFileRoute('/design-system')({
  component: DesignSystemPage,
  staticData: { title: 'Design system' },
});

function DesignSystemPage() {
  return (
    <Toast.Provider>
      <Showcase />
      <Toast.Viewport />
    </Toast.Provider>
  );
}
