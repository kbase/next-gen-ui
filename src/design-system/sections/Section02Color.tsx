import s from './showcase.module.scss';
import { Chip } from '../components/Chip';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import css from './Section02Color.module.scss';

export function Section02Color() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>02</div>
      <div className={s.sTitle}>Color</div>
      <p className={s.sDesc}>
        Named for what KBase users study. The warm neutral base is the signature.
      </p>
      <p className={s.note}>
        Primary, green, yellow, and red are the four status colors: info, success, warning, error.
        They're chosen for best separation under deuteranopia and protanopia, but always pair with
        icon shape too. Toggle the CVD sim in the header to see for yourself.
      </p>
      <p className={s.note}>
        Purple, teal, ocean, orange, grellow, and frost are auxiliary. Always pair them with a
        label, icon, or abbreviation; they collide under color vision deficiency.
      </p>
      <p className={s.note}>
        Do not add, remove, or modify colors without re-verifying under both deuteranopia and
        protanopia. The specific hex values were selected to maintain separation; changing a single
        hue can break the spread and make two colors indistinguishable.
      </p>
      <p className={s.note}>
        <code>c-*</code> is the fill and is the same in both themes, so it is never text. Every
        color also has a tint system with four tokens. Use <code>bg-*</code> on the page background,{' '}
        <code>bgw-*</code> inside cards (Frame), <code>bo-*</code> for borders, and{' '}
        <code>ct-*</code> for text that meets WCAG AA 4.5:1 contrast. The <code>bg-*</code> and{' '}
        <code>bgw-*</code> variants are tuned differently; using <code>bg-*</code> inside a Frame
        looks washed out.
      </p>
      <p className={s.note}>
        When color conveys status, always pair it with a unique icon shape. Each status gets its own
        (CheckCircle for success, XCircle for error, Warning for warning, Clock for queued, Play for
        running). Shape is the discriminator, color is reinforcement.
      </p>

      <div className={s.sub}>Full palette</div>
      <div className={css.colorStrip}>
        <div
          style={{ background: 'var(--c-primary)', height: 8, borderRadius: 'var(--r-sm) 0 0 0' }}
        />
        <div style={{ background: 'var(--c-teal)', height: 8 }} />
        <div style={{ background: 'var(--c-ocean)', height: 8 }} />
        <div style={{ background: 'var(--c-green)', height: 8 }} />
        <div style={{ background: 'var(--c-grellow)', height: 8 }} />
        <div style={{ background: 'var(--c-yellow)', height: 8 }} />
        <div style={{ background: 'var(--c-orange)', height: 8 }} />
        <div style={{ background: 'var(--c-red)', height: 8 }} />
        <div style={{ background: 'var(--c-purple)', height: 8 }} />
        <div
          style={{ background: 'var(--c-frost)', height: 8, borderRadius: '0 var(--r-sm) 0 0' }}
        />
      </div>
      <div className={css.colorStrip}>
        <div style={{ background: 'var(--bg-primary)', height: 6 }} />
        <div style={{ background: 'var(--bg-teal)', height: 6 }} />
        <div style={{ background: 'var(--bg-ocean)', height: 6 }} />
        <div style={{ background: 'var(--bg-green)', height: 6 }} />
        <div style={{ background: 'var(--bg-yellow)', height: 6 }} />
        <div style={{ background: 'var(--bg-orange)', height: 6 }} />
        <div style={{ background: 'var(--bg-red)', height: 6 }} />
        <div style={{ background: 'var(--bg-purple)', height: 6 }} />
      </div>
      <div className={css.colorStrip} style={{ marginBottom: 'var(--s-7)' }}>
        <div
          style={{ background: 'var(--bo-primary)', height: 6, borderRadius: '0 0 0 var(--r-sm)' }}
        />
        <div style={{ background: 'var(--bo-teal)', height: 6 }} />
        <div style={{ background: 'var(--bo-ocean)', height: 6 }} />
        <div style={{ background: 'var(--bo-green)', height: 6 }} />
        <div style={{ background: 'var(--bo-yellow)', height: 6 }} />
        <div style={{ background: 'var(--bo-orange)', height: 6 }} />
        <div style={{ background: 'var(--bo-red)', height: 6 }} />
        <div
          style={{ background: 'var(--bo-purple)', height: 6, borderRadius: '0 0 var(--r-sm) 0' }}
        />
      </div>

      <div className={s.sub}>Semantic (best separation under CVD)</div>
      <div className={css.palette}>
        {[
          ['primary', 'Freshwater Blue'],
          ['green', 'Grass Green'],
          ['yellow', 'Golden Yellow'],
          ['red', 'Rainier Cherry'],
        ].map(([name, label]) => (
          <div key={name} className={css.swatch} style={{ background: `var(--c-${name})` }}>
            <span className={css.swatchTip}>{label}</span>
          </div>
        ))}
      </div>

      <div className={s.sub}>Auxiliary (always paired with label, icon, or abbreviation)</div>
      <div className={css.palette}>
        {[
          ['purple', 'Lupine Purple'],
          ['teal', 'Cyanobacteria'],
          ['ocean', 'Ocean'],
          ['orange', 'Microbe Orange'],
          ['grellow', 'Spring Green'],
          ['frost', 'Frost'],
        ].map(([name, label]) => (
          <div key={name} className={css.swatch} style={{ background: `var(--c-${name})` }}>
            <span className={css.swatchTip}>{label}</span>
          </div>
        ))}
      </div>

      <div className={s.sub}>Warm neutrals</div>
      <div className={css.neutralStrip}>
        <div style={{ background: 'var(--c-bg)', color: 'var(--c-ink3)' }}>bg</div>
        <div style={{ background: 'var(--c-raised)', color: 'var(--c-ink3)' }}>raised</div>
        <div style={{ background: 'var(--c-surface)', color: 'var(--c-ink4)' }}>surface</div>
        <div style={{ background: 'var(--c-warm-200)', color: 'var(--c-ink2)' }}>200</div>
        <div style={{ background: 'var(--c-warm-300)', color: 'var(--c-ink)' }}>300</div>
        <div style={{ background: 'var(--c-ink5)', color: 'var(--c-ink)' }}>400</div>
        <div style={{ background: 'var(--c-ink3)', color: 'white' }}>500</div>
        <div style={{ background: 'var(--c-ink2)', color: 'var(--c-warm-300)' }}>700</div>
        <div style={{ background: 'var(--c-ink)', color: 'var(--c-ink5)' }}>ink</div>
      </div>
      <p className={s.note}>
        Not gray. Every neutral has a brown undertone from the logo's earth palette. The warm base
        lets us spread the semantic colors further apart under CVD without the palette feeling
        clinical or desaturated to people with full color vision.
      </p>

      <div className={s.sub}>Tints in use</div>
      <div className={s.row}>
        <Chip color="primary">primary</Chip>
        <Chip color="green">green</Chip>
        <Chip color="yellow">yellow</Chip>
        <Chip color="red">red</Chip>
      </div>
      <div className={s.row} style={{ marginTop: 'var(--s-3)' }}>
        <Chip color="purple">purple</Chip>
        <Chip color="teal">teal</Chip>
        <Chip color="ocean">ocean</Chip>
        <Chip color="orange">orange</Chip>
      </div>
      <p className={s.note}>
        Purple marks tutorials, educational content, and special features: anything outside the
        normal workflow that teaches rather than does.
      </p>
      <p className={s.note}>
        Teal reads as a calm version of green. Use it for completed stepper steps, confirmed states,
        or passive "done" indicators where green feels like a victory lap.
      </p>
      <p className={s.note}>
        Ocean and orange appear primarily in data type badges: ocean for models and derived objects,
        orange for reads and raw sequencing data. They tie back to the logo's three circles
        (microbes, plants, communities).
      </p>

      <div className={s.sub}>Token reference</div>
      <p className={s.note}>
        Replace <code>*</code> with any color name: <code>primary</code>, <code>green</code>,{' '}
        <code>yellow</code>, <code>red</code>, <code>purple</code>, <code>teal</code>,{' '}
        <code>ocean</code>, <code>orange</code>.
      </p>
      <Table>
        <Thead>
          <Tr>
            <Th>I need...</Th>
            <Th>Token</Th>
            <Th>CSS</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>A solid fill</Td>
            <Td>
              <code>--c-*</code>
            </Td>
            <Td>
              <code>background: var(--c-red)</code>
            </Td>
          </Tr>
          <Tr>
            <Td>A tint background on cream</Td>
            <Td>
              <code>--bg-*</code>
            </Td>
            <Td>
              <code>background: var(--bg-green)</code>
            </Td>
          </Tr>
          <Tr>
            <Td>A tint background inside Frame</Td>
            <Td>
              <code>--bgw-*</code>
            </Td>
            <Td>
              <code>background: var(--bgw-green)</code>
            </Td>
          </Tr>
          <Tr>
            <Td>A tint border</Td>
            <Td>
              <code>--bo-*</code>
            </Td>
            <Td>
              <code>border-color: var(--bo-primary)</code>
            </Td>
          </Tr>
          <Tr>
            <Td>Text (AA contrast)</Td>
            <Td>
              <code>--ct-*</code>
            </Td>
            <Td>
              <code>color: var(--ct-primary)</code>
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </div>
  );
}
