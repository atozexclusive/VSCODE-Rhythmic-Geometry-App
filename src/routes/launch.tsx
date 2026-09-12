import { createFileRoute, redirect } from '@tanstack/react-router';

// Keep old launch links working without a separate mode-choice page.
export const Route = createFileRoute('/launch')({
  beforeLoad: () => {
    throw redirect({ to: '/', hash: 'hero', replace: true });
  },
});
