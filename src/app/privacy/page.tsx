import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy · Padhaku Log' };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="We collect as little as we can, and we never show your email to other students."
      sections={[
        { heading: 'What we store', body: ['Your institute email, only to verify that you are enrolled.', 'Your profile: display name, program, graduation year, and anything optional you add.', 'Friends you make, the chat messages you send them, and safety reports.'] },
        { heading: 'What other students see', body: ['Your display name, program, year and interests.', 'Your campus type (IIT or IIM). The exact campus only when they press Reveal Campus, or once you are friends.', 'Never your email.'] },
        { heading: 'Video and audio', body: ['Calls go directly between the two browsers. We do not record or store video or audio.'] },
      ]}
    />
  );
}
