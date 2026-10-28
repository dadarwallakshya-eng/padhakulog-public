import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Terms of Service · Padhaku Log' };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="By using Padhaku Log you agree to these terms."
      sections={[
        { heading: 'Who can use it', body: ['Currently enrolled students of an approved institution, aged 18 or older, signing in with their own official institute email.'] },
        { heading: 'Your account', body: ['One account per person. Do not share access or sign in with someone else’s email.', 'We may suspend or ban accounts that break the Safety Guidelines.'] },
        { heading: 'The service', body: ['Padhaku Log is provided as is. Matches are random and we cannot guarantee who you will meet.'] },
      ]}
    />
  );
}
