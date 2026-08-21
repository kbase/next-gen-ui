import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Alert,
  Avatar,
  Button,
  Chip,
  Dialog,
  Field,
  Frame,
  Input,
  Skeleton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@kbase/design-system';
import { CheckCircle, CircleDashed, SignOut, XCircle } from '@phosphor-icons/react';

import orcidIdUrl from '../assets/orcid-id.svg';

import {
  authErrorMessage,
  useMe,
  useRevokeOtherSession,
  useSessions,
  useSignOut,
  useUpdateMe,
} from '../api/auth';
import type { Ident, Me, SessionToken } from '../api/auth';

type EditableField = 'name' | 'email';
type FieldStatus = { kind: 'saving' | 'saved' | 'error'; message?: string };

export const Route = createFileRoute('/account')({
  component: AccountPage,
  staticData: { title: 'Account' },
});

function findOrcid(idents: Ident[] | undefined): Ident | undefined {
  return idents?.find((i) => i.provider && /orcid/i.test(i.provider));
}

// Form-layer email check. The wire schema (MeUpdateSchema) is
// permissive on purpose; input rules live here. Pattern matches the
// reference implementation in kbase-ui's AccountInfo.tsx.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s);
}

function formatDate(ms: number | undefined): string {
  if (ms === undefined) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(ms: number | undefined): string {
  if (ms === undefined) return '';
  return new Date(ms).toLocaleString();
}

function browser(t: SessionToken): string {
  return [t.agent, t.agentver].filter(Boolean).join(' ');
}

function operatingSystem(t: SessionToken): string {
  return [t.os, t.osver].filter(Boolean).join(' ');
}

function MfaCell({ status }: { status: SessionToken['mfa'] }) {
  switch (status) {
    case 'Used':
      return <Chip color="green" onWhite icon={CheckCircle} label="Yes" />;
    case 'NotUsed':
      return <Chip color="red" onWhite icon={XCircle} label="No" />;
    case 'Unknown':
      // Neutral: we did not ask and were not told. Tinting it would assert
      // something about the session that this row does not know.
      return <Chip color="neutral" onWhite icon={CircleDashed} label="Unknown" />;
    default:
      return null;
  }
}

function AccountPage() {
  const me = useMe();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-7)' }}>
      <Frame padding={9}>
        <PublicProfileSection me={me} />
      </Frame>
      <Frame padding={9}>
        <IdentitySection me={me} />
      </Frame>
      <Frame padding={9}>
        <SessionSection />
      </Frame>
    </div>
  );
}

function PublicProfileSection({ me }: { me: Me }) {
  const orcid = findOrcid(me.idents);
  const initials = me.display.charAt(0).toUpperCase();
  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--s-4)',
          marginBottom: 'var(--s-7)',
        }}
      >
        <h2 className="h2" style={{ margin: 0 }}>
          Public profile
        </h2>
        <Chip color="yellow" onWhite label="Coming soon" />
      </div>

      {/* Role/affiliation skeletons stand in until those fields exist on Me. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--s-7)',
          marginBottom: 'var(--s-8)',
        }}
      >
        <Avatar size={80} variant="solid" color="primary" initials={initials} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-3)',
          }}
        >
          <div className="h2" style={{ margin: 0 }}>
            {me.display}
          </div>
          <Skeleton width="40%" />
          <Skeleton width="65%" />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-4)',
          paddingTop: 'var(--s-7)',
          borderTop: '1px solid var(--c-border)',
        }}
      >
        <IdentityRow label="ORCID">
          {orcid?.provusername ? (
            <a
              className="link"
              href={`https://orcid.org/${orcid.provusername}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s-3)' }}
            >
              <img src={orcidIdUrl} alt="" width={14} height={14} aria-hidden="true" />
              {orcid.provusername}
            </a>
          ) : (
            <span className="note">Not linked</span>
          )}
        </IdentityRow>
        <IdentityRow label="Username">
          <span className="mono">{me.user}</span>
        </IdentityRow>
        <IdentityRow label="Account created">{formatDate(me.created)}</IdentityRow>
      </div>
    </section>
  );
}

function IdentitySection({ me }: { me: Me }) {
  const update = useUpdateMe();
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [localError, setLocalError] = useState<{ field: EditableField; message: string } | null>(
    null,
  );

  // The auth service permits empty email at the wire level. Treat
  // empty-or-malformed as a form-layer block: the user must fix
  // email before any other field can be saved.
  const emailRequired = !isValidEmail(me.email);

  const status: FieldStatus | null = (() => {
    if (localError && activeField === localError.field) {
      return { kind: 'error', message: localError.message };
    }
    if (!activeField) return null;
    if (update.isPending) return { kind: 'saving' };
    if (update.isError) return { kind: 'error', message: authErrorMessage(update.error) };
    if (update.isSuccess) return { kind: 'saved' };
    return null;
  })();

  function commit(field: EditableField, patch: { display?: string; email?: string }) {
    setLocalError(null);
    setActiveField(field);
    update.mutate(patch);
  }

  function onBlurName(e: React.FocusEvent<HTMLInputElement>) {
    const next = e.target.value.trim();
    if (next === me.display) return;
    if (next.length === 0) {
      e.target.value = me.display;
      return;
    }
    if (emailRequired) {
      e.target.value = me.display;
      setActiveField('name');
      setLocalError({
        field: 'name',
        message: 'Add a valid email address before changing other fields.',
      });
      return;
    }
    commit('name', { display: next });
  }

  function onBlurEmail(e: React.FocusEvent<HTMLInputElement>) {
    const next = e.target.value.trim();
    if (next === me.email) return;
    if (next.length === 0) {
      e.target.value = me.email;
      return;
    }
    if (!isValidEmail(next)) {
      setActiveField('email');
      setLocalError({ field: 'email', message: 'Must be a valid email address.' });
      return;
    }
    commit('email', { email: next });
  }

  return (
    <section>
      <h2 className="h2" style={{ marginBottom: 'var(--s-3)' }}>
        Identity
      </h2>
      <p className="note" style={{ marginBottom: 'var(--s-7)' }}>
        Account details. Changes save automatically.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-6)' }}>
        {emailRequired && (
          <Alert color="yellow">
            Your account has no email address on file. Add one below to enable saving other changes.
          </Alert>
        )}

        <Field.Root invalid={activeField === 'name' && status?.kind === 'error'}>
          <Field.Label>Name</Field.Label>
          <Input
            defaultValue={me.display}
            onBlur={onBlurName}
            autoComplete="name"
            disabled={update.isPending && activeField === 'name'}
          />
          <FieldStatusLine status={activeField === 'name' ? status : null} />
          <Field.Description>Shown on your profile and on content you author.</Field.Description>
        </Field.Root>

        <Field.Root invalid={activeField === 'email' && status?.kind === 'error'}>
          <Field.Label>Email</Field.Label>
          <Input
            type="email"
            defaultValue={me.email}
            onBlur={onBlurEmail}
            autoComplete="email"
            disabled={update.isPending && activeField === 'email'}
          />
          <FieldStatusLine status={activeField === 'email' ? status : null} />
          <Field.Description>Used for KBase notifications and account recovery.</Field.Description>
        </Field.Root>
      </div>
    </section>
  );
}

function FieldStatusLine({ status }: { status: FieldStatus | null }) {
  if (!status) return null;
  const color =
    status.kind === 'error'
      ? 'var(--ct-red)'
      : status.kind === 'saved'
        ? 'var(--ct-green)'
        : 'var(--c-ink3)';
  const label =
    status.kind === 'saving' ? 'Saving…' : status.kind === 'saved' ? 'Saved' : status.message;
  return (
    <p className="note" style={{ marginTop: 'var(--s-2)', color }}>
      {label}
    </p>
  );
}

function IdentityRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s-6)' }}>
      <label htmlFor={htmlFor} className="caption" style={{ width: '12ch', flexShrink: 0 }}>
        {label}
      </label>
      <div className="body" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

function SessionSection() {
  const signOut = useSignOut();
  const sessions = useSessions();
  const revoke = useRevokeOtherSession();

  const currentRow = sessions.data?.current;
  // /tokens/ returns every token type the user has (Login, Service,
  // Developer). We surface them all; kbase-ui's LogInSessions does
  // the same. Hiding non-Login rows would mask sessions a user can
  // and may want to revoke.
  const others = (sessions.data?.tokens ?? []).filter((t) => t.id !== currentRow?.id);

  return (
    <section>
      <h2 className="h2" style={{ marginBottom: 'var(--s-4)' }}>
        Sessions
      </h2>
      <p className="note" style={{ marginBottom: 'var(--s-7)', maxWidth: '60ch' }}>
        Signing out revokes the current session token. Other active sessions can be revoked
        individually below.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--s-4)',
          marginBottom: 'var(--s-5)',
        }}
      >
        <div className="sub" style={{ margin: 0 }}>
          Current session
        </div>
        <Dialog.Root>
          <Dialog.Trigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={signOut.isPending}
                style={{ gap: 'var(--s-2)' }}
              >
                <SignOut size={12} />
                {signOut.isPending ? 'Signing out…' : 'Sign out'}
              </Button>
            }
          />
          <Dialog.Popup>
            <Dialog.Title>Sign out?</Dialog.Title>
            <Dialog.Description>
              Your current session will be revoked and you'll return to the sign-in page.
            </Dialog.Description>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s-3)' }}>
              <Dialog.Close
                render={
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                }
              />
              <Dialog.Close
                render={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => signOut.mutate()}
                    style={{ gap: 'var(--s-2)' }}
                  >
                    <SignOut size={12} />
                    Sign out
                  </Button>
                }
              />
            </div>
          </Dialog.Popup>
        </Dialog.Root>
      </div>

      <SessionsTable
        rows={currentRow ? <CurrentRow row={currentRow} /> : null}
        skeletonRows={1}
        showActionColumn={false}
        empty={sessions.isError}
      />

      <div className="sub" style={{ marginTop: 'var(--s-9)', marginBottom: 'var(--s-5)' }}>
        Other active sessions
      </div>

      {sessions.isError ? (
        <Alert
          color="red"
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void sessions.refetch()}
              disabled={sessions.isFetching}
            >
              {sessions.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          }
        >
          Couldn't load sessions: {authErrorMessage(sessions.error)}
        </Alert>
      ) : sessions.isPending ? (
        <SessionsTable rows={null} skeletonRows={3} />
      ) : others.length === 0 ? (
        <p className="note">No other active sessions.</p>
      ) : (
        <SessionsTable
          rows={others.map((t) => (
            <OtherRow
              key={t.id}
              row={t}
              busy={revoke.isPending && revoke.variables === t.id}
              onRevoke={() => revoke.mutate(t.id)}
            />
          ))}
          skeletonRows={0}
        />
      )}

      {revoke.isError && (
        <div style={{ marginTop: 'var(--s-5)' }}>
          <Alert color="red">{authErrorMessage(revoke.error)}</Alert>
        </div>
      )}
    </section>
  );
}

function CurrentRow({ row }: { row: SessionToken }) {
  return (
    <Tr>
      <Td>{formatDateTime(row.created)}</Td>
      <Td>{formatDateTime(row.expires)}</Td>
      <Td>{browser(row)}</Td>
      <Td>{operatingSystem(row)}</Td>
      <Td className="mono">{row.ip ?? ''}</Td>
      <Td>
        <MfaCell status={row.mfa} />
      </Td>
    </Tr>
  );
}

function OtherRow({
  row,
  busy,
  onRevoke,
}: {
  row: SessionToken;
  busy: boolean;
  onRevoke: () => void;
}) {
  return (
    <Tr>
      <Td>{formatDateTime(row.created)}</Td>
      <Td>{formatDateTime(row.expires)}</Td>
      <Td>{browser(row)}</Td>
      <Td>{operatingSystem(row)}</Td>
      <Td className="mono">{row.ip ?? ''}</Td>
      <Td>
        <MfaCell status={row.mfa} />
      </Td>
      <Td>
        <Button type="button" variant="outline" size="sm" onClick={onRevoke} disabled={busy}>
          {busy ? 'Revoking…' : 'Revoke'}
        </Button>
      </Td>
    </Tr>
  );
}

// Skeleton mirrors the eventual cell shape so layout stays stable
// while data loads ("shape known, data isn't").
function SessionsTable({
  rows,
  skeletonRows,
  showActionColumn = true,
  empty = false,
}: {
  rows: React.ReactNode | null;
  skeletonRows: number;
  showActionColumn?: boolean;
  empty?: boolean;
}) {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Created</Th>
          <Th>Expires</Th>
          <Th>Browser</Th>
          <Th>OS</Th>
          <Th>IP</Th>
          <Th>MFA</Th>
          {showActionColumn && <Th>Action</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {empty
          ? null
          : (rows ?? <SkeletonRows count={skeletonRows} hasAction={showActionColumn} />)}
      </Tbody>
    </Table>
  );
}

function SkeletonRows({ count, hasAction }: { count: number; hasAction: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Tr key={`sk-${i}`}>
          <Td>
            <Skeleton width="9ch" />
          </Td>
          <Td>
            <Skeleton width="9ch" />
          </Td>
          <Td>
            <Skeleton width="11ch" />
          </Td>
          <Td>
            <Skeleton width="9ch" />
          </Td>
          <Td>
            <Skeleton width="10ch" />
          </Td>
          <Td>
            <Skeleton width="1.5ch" />
          </Td>
          {hasAction && (
            <Td>
              <Skeleton width={64} height={24} variant="rectangular" />
            </Td>
          )}
        </Tr>
      ))}
    </>
  );
}
