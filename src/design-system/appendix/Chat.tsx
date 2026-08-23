import { useState } from 'react';
import { Frame } from '../components/Frame';
import { Avatar } from '../components/Avatar';
import { PromptInput } from '../components/PromptInput';
import { CodeBlock } from '../components/CodeBlock';
import s from './appendix-shared.module.scss';

const indent = { marginLeft: 'calc(24px + var(--s-4))' };

function MsgHeader({
  initials,
  color,
  name,
  time,
}: {
  initials: string;
  color?: 'teal' | 'purple';
  name: string;
  time: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-4)' }}>
      <Avatar size={24} initials={initials} color={color} />
      <span className="byline">{name}</span>
      <span className="timestamp">{time}</span>
    </div>
  );
}

export function ChatAppendix() {
  const [draft, setDraft] = useState('');

  // The button is disabled when blank, Enter is not, so the guard lives here.
  function sendDraft() {
    if (draft.trim()) setDraft('');
  }
  return (
    <div className={s.root}>
      <div className={s.num}>E</div>
      <div className={s.title}>Chat pattern</div>
      <p className={s.desc}>
        Multi-participant CRDT chat. Feed layout with colored avatars, message grouping, and
        prompt-style input.
      </p>
      <p className={s.note}>
        Right border marks own messages. Consecutive same-author messages group without repeating
        avatar. Avatar color prop distinguishes participants.
      </p>

      <div style={{ marginTop: 'var(--s-7)' }}>
        <Frame padding={0} style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s-4)',
              padding: 'var(--s-5) var(--s-7)',
              borderBottom: '1px solid var(--c-border)',
            }}
          >
            <span className="h4">Rhizosphere Assembly</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 'var(--fs-4)', color: 'var(--c-ink5)' }}>3 participants</span>
          </div>

          <div style={{ padding: 'var(--s-5) var(--s-7)' }}>
            <div
              style={{
                fontSize: 'var(--fs-4)',
                color: 'var(--c-ink5)',
                textAlign: 'center',
                marginBottom: 'var(--s-5)',
              }}
            >
              Today
            </div>

            <div
              style={{
                marginBottom: 'var(--s-5)',
                borderRight: '2px solid var(--c-teal)',
                marginRight: 'calc(var(--s-7) * -1)',
                paddingRight: 'var(--s-7)',
              }}
            >
              <MsgHeader initials="JD" color="teal" name="Jane Doe" time="2:31 PM" />
              <div className="body" style={{ ...indent, marginTop: 'var(--s-1)' }}>
                Has anyone tried assembling the rhizosphere reads?
              </div>
            </div>

            <div
              style={{
                marginBottom: 'var(--s-5)',
                borderRight: '2px solid transparent',
                marginRight: 'calc(var(--s-7) * -1)',
                paddingRight: 'var(--s-7)',
              }}
            >
              <MsgHeader initials="AS" color="purple" name="Alex Smith" time="2:33 PM" />
              <div className="body" style={{ ...indent, marginTop: 'var(--s-1)' }}>
                Yeah, I ran MEGAHIT on it yesterday. N50 is low.
              </div>
              <div style={{ ...indent, marginTop: 'var(--s-3)' }}>
                <CodeBlock
                  collapsible={false}
                  language="python"
                  code={`au.run_megahit({
    "read_library_ref": "45221/2/1",
    "min_contig_len": 500
})`}
                />
              </div>
            </div>

            <div
              style={{
                marginBottom: 'var(--s-5)',
                borderRight: '2px solid var(--c-teal)',
                marginRight: 'calc(var(--s-7) * -1)',
                paddingRight: 'var(--s-7)',
              }}
            >
              <MsgHeader initials="JD" color="teal" name="Jane Doe" time="2:35 PM" />
              <div className="body" style={{ ...indent, marginTop: 'var(--s-1)' }}>
                What about SPAdes for soil samples?
              </div>
            </div>

            <div
              style={{
                borderRight: '2px solid transparent',
                marginRight: 'calc(var(--s-7) * -1)',
                paddingRight: 'var(--s-7)',
              }}
            >
              <MsgHeader initials="KB" name="KBase AI" time="2:35 PM" />
              <div className="body" style={{ ...indent, marginTop: 'var(--s-1)' }}>
                For soil metagenomes, MEGAHIT with extended k-mer list typically outperforms SPAdes.
              </div>
            </div>

            <div className="note" style={{ ...indent, marginTop: 'var(--s-4)' }}>
              KBase AI is typing…
            </div>
          </div>

          <PromptInput
            flush
            label="Message"
            placeholder="Message Rhizosphere Assembly…"
            value={draft}
            onValueChange={setDraft}
            onSubmit={sendDraft}
          />
        </Frame>
      </div>
    </div>
  );
}
