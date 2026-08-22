import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Field from '../Field';
import { Autocomplete } from './Autocomplete';

const PROJECTS = ['Soil Metagenome', 'Ocean Sampling', 'Soil Carbon Flux'];

describe('Autocomplete', () => {
  it('narrows the suggestions as you type', async () => {
    render(<Autocomplete items={PROJECTS} aria-label="Project" />);

    await userEvent.type(screen.getByRole('combobox'), 'soil');

    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Soil Metagenome', 'Soil Carbon Flux']);
  });

  it('keeps a value that is not in the list', async () => {
    const onValueChange = vi.fn();
    render(<Autocomplete items={PROJECTS} onValueChange={onValueChange} aria-label="Project" />);

    await userEvent.type(screen.getByRole('combobox'), 'Permafrost Cores');

    expect(screen.getByRole('combobox')).toHaveValue('Permafrost Cores');
    expect(onValueChange).toHaveBeenLastCalledWith('Permafrost Cores', expect.anything());
  });

  it('offers the alternatives when the field already holds one', async () => {
    render(<Autocomplete items={PROJECTS} defaultValue="Ocean Sampling" aria-label="Project" />);

    await userEvent.click(screen.getByRole('combobox'));

    // Filtering by the current value would leave only the current value.
    expect(await screen.findAllByRole('option')).toHaveLength(PROJECTS.length);
  });

  it('fills the input from the list', async () => {
    render(<Autocomplete items={PROJECTS} aria-label="Project" />);

    await userEvent.type(screen.getByRole('combobox'), 'ocean');
    await userEvent.click(await screen.findByRole('option', { name: 'Ocean Sampling' }));

    expect(screen.getByRole('combobox')).toHaveValue('Ocean Sampling');
  });

  it('takes its name from the Field label', () => {
    render(
      <Field.Root>
        <Field.Label>Project</Field.Label>
        <Autocomplete items={PROJECTS} />
      </Field.Root>,
    );

    expect(screen.getByRole('combobox', { name: 'Project' })).toBeInTheDocument();
  });
});
