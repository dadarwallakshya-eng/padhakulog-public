import { Landing } from '@/components/landing/Landing';
import { getRegistry } from '@/lib/registry';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [registry, user] = await Promise.all([getRegistry(), getCurrentUser()]);
  return (
    <Landing
      registry={registry}
      signedIn={user ? { campus: user.institution.name, next: user.onboarded ? '/roulette' : '/onboarding' } : null}
    />
  );
}
