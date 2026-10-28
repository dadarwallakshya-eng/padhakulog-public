import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Safety Guidelines · Padhaku Log' };

export default function Safety() {
  return (
    <LegalPage
      title="Safety Guidelines"
      intro="Padhaku Log works because everyone on it is a real, verified student. Keep it that way."
      sections={[
        { heading: 'Be someone people want to meet', body: ['Treat people the way you would at a fest or a hostel common room.', 'No nudity, sexual content, harassment, hate speech or threats. Ever.', 'No spam, selling, or recording people without their consent.'] },
        { heading: 'If something feels off', body: ['Press Next. You never owe anyone a conversation.', 'Use the red flag to report. The call ends instantly and you will not be matched with that person again.', 'Reports are reviewed by moderators. Serious violations lead to a permanent ban across all campuses.'] },
        { heading: '18+ only', body: ['Everyone must be 18 or older. Report anyone who appears underage.'] },
      ]}
    />
  );
}
