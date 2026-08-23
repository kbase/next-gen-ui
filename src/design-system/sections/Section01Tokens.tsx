import s from './showcase.module.scss';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import css from './Section01Tokens.module.scss';

export function Section01Tokens() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>01</div>
      <div className={s.sTitle}>Spacing & Layout</div>
      <p className={s.sDesc}>
        4px grid for spacing, concentric radii for nesting. Both are CSS custom properties in{' '}
        <code>tokens.css</code>; no raw pixel values, because that is how 13px and 7px end up in
        your components.
      </p>

      <div className={s.sub}>Spacing</div>
      <div className={css.spacingRuler}>
        {[
          ['s-1', '4px'],
          ['s-2', '6px'],
          ['s-3', '8px'],
          ['s-4', '10px'],
          ['s-5', '12px'],
          ['s-6', '14px'],
          ['s-7', '18px'],
          ['s-8', '22px'],
          ['s-9', '26px'],
          ['s-10', '34px'],
          ['s-11', '38px'],
          ['s-12', '50px'],
        ].map(([name, val]) => (
          <div key={name} className={css.spacingStep}>
            <div className={css.spacingBar} style={{ width: val }} />
            <span className={css.spacingLabel}>{name}</span>
            <span className={css.spacingVal}>{val}</span>
          </div>
        ))}
      </div>
      <p className={s.note}>
        SCSS: <code>padding: var(--s-5) var(--s-7);</code> &mdash; JSX:{' '}
        <code>{`padding: 'var(--s-5) var(--s-7)'`}</code>
      </p>
      <p className={s.note}>
        Row padding is s-2 / s-4. Frame inner padding is s-7. Component gaps are s-4. Chip padding
        is s-3. No raw pixel values anywhere in the system.
      </p>

      <p className={s.note}>
        Font sizes are tokens too: <code>--fs-1</code> through <code>--fs-11</code>, plus{' '}
        <code>--fs-hero</code> for the showcase headline. The index runs smallest to largest, so
        rescaling the system means editing only <code>tokens.css</code>. Roles, CSS classes, and
        naming rules in section 03.
      </p>

      <div className={s.sub}>Radius</div>
      <div className={css.radiusDemo}>
        <div className={css.radiusOuter}>
          <span className={css.radiusLabel}>r-lg 12px (frame)</span>
          <div className={css.radiusInner}>
            <span className={css.radiusLabel}>r-sm 4px (inner element)</span>
          </div>
        </div>
        <div className={s.row} style={{ marginTop: 'var(--s-6)' }}>
          <div className={css.radiusSample} style={{ borderRadius: 'var(--r-sm)' }}>
            r-sm 4px
          </div>
          <div className={css.radiusSample} style={{ borderRadius: 'var(--r-button)' }}>
            r-button 6px
          </div>
          <div className={css.radiusSample} style={{ borderRadius: 'var(--r-md)' }}>
            r-md 8px
          </div>
          <div className={css.radiusSample} style={{ borderRadius: 'var(--r-lg)' }}>
            r-lg 12px
          </div>
          <div className={css.radiusSample} style={{ borderRadius: 'var(--r-full)' }}>
            r-full
          </div>
        </div>
      </div>
      <Table>
        <Thead>
          <Tr>
            <Th>Token</Th>
            <Th>Where</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>
              <code>--r-lg</code> 12px
            </Td>
            <Td>Frame, cards, code blocks, dialogs</Td>
          </Tr>
          <Tr>
            <Td>
              <code>--r-md</code> 8px
            </Td>
            <Td>Inputs, alerts, menus</Td>
          </Tr>
          <Tr>
            <Td>
              <code>--r-button</code> 6px
            </Td>
            <Td>Button-shaped controls (Button, NavIcon, SegmentedControl)</Td>
          </Tr>
          <Tr>
            <Td>
              <code>--r-sm</code> 4px
            </Td>
            <Td>Chips, badges, elements inside frames</Td>
          </Tr>
          <Tr>
            <Td>
              <code>--r-full</code>
            </Td>
            <Td>Avatars, pills, progress bars, search bar</Td>
          </Tr>
        </Tbody>
      </Table>
      <p className={s.note}>
        Concentric: inner radius = outer minus padding. A chip (r-sm) inside a frame (r-lg) nests
        cleanly.
      </p>

      <p className={s.note}>
        Color palette, ink hierarchy, tint tokens, and CVD rules in section 02. Typography scale,
        CSS classes, and naming conventions in section 03.
      </p>
    </div>
  );
}
