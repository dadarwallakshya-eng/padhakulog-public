// The approved campus registry the database is seeded from. The database is the
// source of truth at runtime (admins can add or deactivate campuses).

export type InstitutionType = 'IIT' | 'IIM';

export interface InstitutionSeed {
  id: string;
  name: string;
  shortName: string;
  institutionType: InstitutionType;
  primaryDomain: string;
}

const iit = (id: string, name: string, shortName: string, domain: string): InstitutionSeed => ({
  id, name, shortName, institutionType: 'IIT', primaryDomain: domain,
});
const iim = (id: string, name: string, shortName: string, domain: string): InstitutionSeed => ({
  id, name, shortName, institutionType: 'IIM', primaryDomain: domain,
});

export const INSTITUTIONS: InstitutionSeed[] = [
  iit('iit-bombay', 'IIT Bombay', 'IITB', 'iitb.ac.in'),
  iit('iit-delhi', 'IIT Delhi', 'IITD', 'iitd.ac.in'),
  iit('iit-madras', 'IIT Madras', 'IITM', 'iitm.ac.in'),
  iit('iit-kanpur', 'IIT Kanpur', 'IITK', 'iitk.ac.in'),
  iit('iit-kharagpur', 'IIT Kharagpur', 'IITKGP', 'iitkgp.ac.in'),
  iit('iit-roorkee', 'IIT Roorkee', 'IITR', 'iitr.ac.in'),
  iit('iit-guwahati', 'IIT Guwahati', 'IITG', 'iitg.ac.in'),
  iit('iit-hyderabad', 'IIT Hyderabad', 'IITH', 'iith.ac.in'),
  iit('iit-patna', 'IIT Patna', 'IITP', 'iitp.ac.in'),
  iit('iit-gandhinagar', 'IIT Gandhinagar', 'IITGN', 'iitgn.ac.in'),
  iit('iit-jodhpur', 'IIT Jodhpur', 'IITJ', 'iitj.ac.in'),
  iit('iit-ropar', 'IIT Ropar', 'IITRPR', 'iitrpr.ac.in'),
  iit('iit-indore', 'IIT Indore', 'IITI', 'iiti.ac.in'),
  iit('iit-mandi', 'IIT Mandi', 'IITMandi', 'iitmandi.ac.in'),
  iit('iit-bhu', 'IIT (BHU) Varanasi', 'IIT BHU', 'iitbhu.ac.in'),
  iit('iit-palakkad', 'IIT Palakkad', 'IITPKD', 'iitpkd.ac.in'),
  iit('iit-tirupati', 'IIT Tirupati', 'IITTP', 'iittp.ac.in'),
  iit('iit-ism-dhanbad', 'IIT (ISM) Dhanbad', 'IIT ISM', 'iitism.ac.in'),
  iit('iit-bhilai', 'IIT Bhilai', 'IIT Bhilai', 'iitbhilai.ac.in'),
  iit('iit-goa', 'IIT Goa', 'IIT Goa', 'iitgoa.ac.in'),
  iit('iit-jammu', 'IIT Jammu', 'IIT Jammu', 'iitjammu.ac.in'),
  iit('iit-dharwad', 'IIT Dharwad', 'IITDH', 'iitdh.ac.in'),
  iit('iit-bhubaneswar', 'IIT Bhubaneswar', 'IITBBS', 'iitbbs.ac.in'),
  iim('iim-ahmedabad', 'IIM Ahmedabad', 'IIMA', 'iima.ac.in'),
  iim('iim-bangalore', 'IIM Bangalore', 'IIMB', 'iimb.ac.in'),
  iim('iim-calcutta', 'IIM Calcutta', 'IIMC', 'iimcal.ac.in'),
  iim('iim-lucknow', 'IIM Lucknow', 'IIML', 'iiml.ac.in'),
  iim('iim-kozhikode', 'IIM Kozhikode', 'IIMK', 'iimk.ac.in'),
  iim('iim-indore', 'IIM Indore', 'IIM Indore', 'iimidr.ac.in'),
  iim('iim-shillong', 'IIM Shillong', 'IIM Shillong', 'iimshillong.ac.in'),
  iim('iim-rohtak', 'IIM Rohtak', 'IIM Rohtak', 'iimrohtak.ac.in'),
  iim('iim-ranchi', 'IIM Ranchi', 'IIM Ranchi', 'iimranchi.ac.in'),
  iim('iim-raipur', 'IIM Raipur', 'IIM Raipur', 'iimraipur.ac.in'),
  iim('iim-tiruchirappalli', 'IIM Tiruchirappalli', 'IIM Trichy', 'iimtrichy.ac.in'),
  iim('iim-udaipur', 'IIM Udaipur', 'IIMU', 'iimu.ac.in'),
  iim('iim-kashipur', 'IIM Kashipur', 'IIM Kashipur', 'iimkashipur.ac.in'),
  iim('iim-nagpur', 'IIM Nagpur', 'IIM Nagpur', 'iimnagpur.ac.in'),
  iim('iim-visakhapatnam', 'IIM Visakhapatnam', 'IIMV', 'iimv.ac.in'),
  iim('iim-bodh-gaya', 'IIM Bodh Gaya', 'IIMBG', 'iimbg.ac.in'),
  iim('iim-jammu', 'IIM Jammu', 'IIMJ', 'iimj.ac.in'),
  iim('iim-sambalpur', 'IIM Sambalpur', 'IIM Sambalpur', 'iimsambalpur.ac.in'),
  iim('iim-sirmaur', 'IIM Sirmaur', 'IIM Sirmaur', 'iimsirmaur.ac.in'),
  iim('iim-amritsar', 'IIM Amritsar', 'IIM Amritsar', 'iimamritsar.ac.in'),
  iim('iim-mumbai', 'IIM Mumbai', 'IIM Mumbai', 'iimmumbai.ac.in'),
];
