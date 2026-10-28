import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/components/OnboardingForm';
import { avatarUrl, safeList } from '@/lib/match';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  return (
    <OnboardingForm
      campus={user.institution.name}
      campusType={user.institution.institutionType}
      editing={user.onboarded}
      initial={{
        handle: user.handle,
        avatarUrl: avatarUrl(user.avatarKey),
        bio: user.bio || '',
        languages: safeList(user.languages),
        gender: user.gender || 'Prefer not to say',
        ageVerified: user.ageVerified,
      }}
    />
  );
}
