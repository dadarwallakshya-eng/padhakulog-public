import { redirect } from 'next/navigation';
import { RouletteClient } from '@/components/roulette/RouletteClient';
import { avatarUrl } from '@/lib/match';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function RoulettePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  if (!user.onboarded) redirect('/onboarding');
  return <RouletteClient me={{ id: user.id, handle: user.handle, avatarUrl: avatarUrl(user.avatarKey), campus: user.institution.name, meetSameCampus: user.meetSameCampus }} />;
}
