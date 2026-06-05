import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/riff')({
  beforeLoad: () => {
    throw redirect({
      to: '/app',
      search: {
        mode: 'riff-cycle-study',
      },
    });
  },
});
