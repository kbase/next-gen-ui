import { definePrompt } from '@kbase/plugin-sdk';
import { koros } from './store';

// Free text is a message to the current arc's session, as in KIND*AI's
// composer; to an arc not yet asked it is the question. With no arc current
// it goes to a new one. The cart travels with a turn: an attachment is part
// of what was sent, so it is recorded on the turn rather than read from the
// cart later, which by then may hold something else.
export default definePrompt({
  handle: async ({ text }, { host, attachments }) => {
    const slug = koros.current() ?? koros.newArc().slug;
    koros.steer(
      slug,
      text ?? '',
      attachments.map((item) => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        path: item.source && 'path' in item.source ? item.source.path : undefined,
      })),
    );
    host.openRoute(`/${slug}`);
  },
  // KIND*AI's + New question: a new arc, its page open, the next message its
  // question. An empty one already open is reused.
  newConversation: ({ host }) => {
    const arc = koros.newArc();
    host.openRoute(`/${arc.slug}`);
  },
  destination: { current: () => koros.destination(), subscribe: koros.subscribe },
});
