import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { definePluginManifest } from '@kbase/plugin-sdk';
import { testWorkbench } from '../../../test/workbench';
import { localPlugin } from '../../host/plugins/local';
import { WorkbenchProvider } from '../WorkbenchProvider';
import { AddPluginForm } from './AddPluginForm';

const url = 'http://plugins.test/services/hello/manifest.json';

function mount() {
  const services = testWorkbench();
  render(
    <WorkbenchProvider services={services}>
      <AddPluginForm />
    </WorkbenchProvider>,
  );
  return services;
}

describe('the add-by-URL form', () => {
  it('runs /install with the URL and says what was installed', async () => {
    const user = userEvent.setup();
    const services = mount();
    const run = vi.spyOn(services.registry, 'run').mockImplementation(async () => {
      services.source.add({
        ...localPlugin({ config: definePluginManifest({ id: 'hello', title: 'Hello' }) }),
        origin: { url },
      });
    });

    await user.type(screen.getByRole('textbox', { name: 'Manifest URL' }), url);
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(run).toHaveBeenCalledWith('workbench:install', { url }, 'user');
    expect(screen.getByRole('status')).toHaveTextContent('Hello is installed.');
    expect(screen.getByRole('textbox', { name: 'Manifest URL' })).toHaveValue('');
  });

  it('shows the rejection under the field and keeps the URL', async () => {
    const user = userEvent.setup();
    const services = mount();
    vi.spyOn(services.registry, 'run').mockRejectedValue(
      new Error(`could not fetch ${url}; the server must allow cross-origin requests`),
    );

    await user.type(screen.getByRole('textbox', { name: 'Manifest URL' }), url);
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(
      screen.getByText(`could not fetch ${url}; the server must allow cross-origin requests`),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Manifest URL' })).toHaveValue(url);
  });
});
