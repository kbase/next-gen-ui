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

  it('reports a value that is not in the list', async () => {
    const onValueChange = vi.fn();
    render(<Autocomplete items={PROJECTS} onValueChange={onValueChange} aria-label="Project" />);

    await userEvent.type(screen.getByRole('combobox'), 'Permafrost Cores');

    expect(onValueChange).toHaveBeenLastCalledWith('Permafrost Cores', expect.anything());
  });

  it('lists every item when the field already holds one', async () => {
    render(<Autocomplete items={PROJECTS} defaultValue="Ocean Sampling" aria-label="Project" />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(await screen.findAllByRole('option')).toHaveLength(PROJECTS.length);
  });

  it('lists every item whatever case the value is in', async () => {
    // Values are free text, so any case can arrive.
    render(<Autocomplete items={PROJECTS} defaultValue="ocean sampling" aria-label="Project" />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(await screen.findAllByRole('option')).toHaveLength(PROJECTS.length);
  });

  it('lists every item when opened from the keyboard', async () => {
    render(<Autocomplete items={PROJECTS} defaultValue="Ocean Sampling" aria-label="Project" />);

    screen.getByRole('combobox').focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(await screen.findAllByRole('option')).toHaveLength(PROJECTS.length);
  });

  it('narrows while typing, even onto a whole item', async () => {
    render(<Autocomplete items={PROJECTS} aria-label="Project" />);

    await userEvent.type(screen.getByRole('combobox'), 'Ocean Sampling');

    expect(await screen.findAllByRole('option')).toHaveLength(1);
  });

  it('says what happens to a value that matches nothing', async () => {
    render(
      <Autocomplete items={PROJECTS} emptyMessage="Nothing by that name." aria-label="Project" />,
    );

    await userEvent.type(screen.getByRole('combobox'), 'zzz');

    expect(await screen.findByText('Nothing by that name.')).toBeInTheDocument();
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
