// The reference configuration as the web repository seeds it (migrations
// 0010_reference_configuration.sql and 0035_employment_details.sql), so the
// mock renders the same forms a real backend would. Keep it in step with
// those migrations; it is test data, not a second source of truth.
import type { ChecklistItem, MembershipType, MembershipTypeField } from '../types';

type Row = [
  key: string,
  label: string,
  type: MembershipTypeField['dataType'],
  choices: string[],
  subject: MembershipTypeField['subject'],
  mandatory: boolean,
];

function fields(typeCode: string, rows: Row[]): MembershipTypeField[] {
  const perSubject = new Map<string, number>();
  return rows.map(([fieldKey, label, dataType, choices, subject, isMandatory]) => {
    const sortOrder = (perSubject.get(subject) ?? 0) + 1;
    perSubject.set(subject, sortOrder);
    return {
      id: `${typeCode}.${subject}.${fieldKey}`,
      fieldKey,
      label,
      dataType,
      choices,
      subject,
      isVisible: true,
      isMandatory,
      sortOrder,
    };
  });
}

type ItemRow = [
  code: string,
  name: string,
  requirement: 'required' | 'optional',
  tracksExpiry?: boolean,
];

function checklist(prefix: string, rows: ItemRow[]): ChecklistItem[] {
  return rows.map(([documentCode, documentName, requirement, tracksExpiry], i) => ({
    id: `${prefix}.${documentCode}`,
    documentCode,
    documentName,
    subject: 'applicant',
    requirement,
    tracksExpiry: tracksExpiry ?? false,
    sortOrder: i + 1,
  }));
}

const GENDER = ['Male', 'Female'];

export const MEMBERSHIP_TYPES: MembershipType[] = [
  {
    id: 'mt-individual',
    code: 'individual',
    name: 'Individual',
    description: 'An adult applying in their own name.',
    isActive: true,
    nomineeCount: 1,
    fees: [
      { code: 'entrance_fee', name: 'Entrance fee', amount: '100.00', requirement: 'required' },
      { code: 'share_capital', name: 'Share capital', amount: '500.00', requirement: 'required' },
      { code: 'msa_opening', name: 'Multiplier Savings Account opening', amount: '5000.00', requirement: 'required' },
    ],
    checklist: checklist('individual_kyc', [
      ['id_card', 'National identity card', 'required'],
      ['utility_bill', 'Proof of address (utility bill)', 'required', true],
      ['marriage_certificate', 'Marriage certificate', 'optional'],
    ]),
    fields: fields('individual', [
      ['surname', 'Surname', 'text', [], 'applicant', true],
      ['name', 'Name', 'text', [], 'applicant', true],
      ['nic', 'NIC', 'text', [], 'applicant', true],
      ['gender', 'Gender', 'choice', GENDER, 'applicant', true],
      ['marital_status', 'Marital status', 'choice', ['Single', 'Married', 'Others'], 'applicant', false],
      ['address', 'Address', 'text', [], 'applicant', true],
      ['mobile', 'Mobile', 'phone', [], 'applicant', true],
      ['telephone', 'Telephone', 'phone', [], 'applicant', false],
      ['email', 'Email', 'email', [], 'applicant', false],
      ['employer_name', 'Employer name', 'text', [], 'employment', false],
      ['occupation', 'Occupation', 'text', [], 'employment', false],
      ['employment_status', 'Employment status', 'choice', ['Employed', 'Self-employed', 'Unemployed', 'Retired', 'Student'], 'employment', false],
      ['monthly_income', 'Monthly income', 'number', [], 'employment', false],
      ['surname', 'Nominee surname', 'text', [], 'nominee', true],
      ['name', 'Nominee name', 'text', [], 'nominee', true],
      ['nic', 'Nominee NIC', 'text', [], 'nominee', true],
      ['address', 'Nominee address', 'text', [], 'nominee', true],
      ['mobile', 'Nominee mobile', 'phone', [], 'nominee', false],
      ['telephone', 'Nominee telephone', 'phone', [], 'nominee', false],
      ['email', 'Nominee email', 'email', [], 'nominee', false],
    ]),
  },
  {
    id: 'mt-corporate',
    code: 'corporate',
    name: 'Corporate',
    description: 'A registered company, société or association.',
    isActive: true,
    nomineeCount: 1,
    fees: [
      { code: 'entrance_fee', name: 'Entrance fee', amount: '500.00', requirement: 'required' },
      { code: 'share_capital', name: 'Share capital', amount: '2500.00', requirement: 'required' },
      { code: 'msa_opening', name: 'Multiplier Savings Account opening', amount: '5000.00', requirement: 'required' },
    ],
    checklist: checklist('corporate_kyc', [
      ['cert_registration', 'Certificate of registration', 'required'],
      ['utility_bill', 'Proof of address (utility bill)', 'required', true],
      ['memorandum', 'Memorandum and articles', 'required'],
      ['written_resolution', 'Written resolution to apply', 'required'],
    ]),
    fields: fields('corporate', [
      ['name', 'Registered entity name', 'text', [], 'applicant', true],
      ['registration_no', 'Registration No.', 'text', [], 'applicant', true],
      ['address', 'Address', 'text', [], 'applicant', true],
      ['mobile', 'Mobile', 'phone', [], 'applicant', true],
      ['telephone', 'Telephone', 'phone', [], 'applicant', false],
      ['email', 'Email', 'email', [], 'applicant', false],
      ['contact_person', 'Contact Person', 'text', [], 'applicant', true],
      ['contact_telephone', 'Contact Person — Telephone', 'phone', [], 'applicant', true],
      ['surname', 'Nominee surname', 'text', [], 'nominee', true],
      ['name', 'Nominee name', 'text', [], 'nominee', true],
      ['nic', 'Nominee NIC', 'text', [], 'nominee', true],
      ['address', 'Nominee address', 'text', [], 'nominee', true],
      ['mobile', 'Nominee mobile', 'phone', [], 'nominee', false],
    ]),
  },
  {
    id: 'mt-minor',
    code: 'minor',
    name: 'Minor',
    description: 'A child under 18, applied for by a guardian who is a member.',
    isActive: true,
    nomineeCount: 1,
    fees: [
      { code: 'entrance_fee', name: 'Entrance fee', amount: '50.00', requirement: 'required' },
      { code: 'share_capital', name: 'Share capital', amount: '250.00', requirement: 'required' },
      { code: 'msa_opening', name: 'Multiplier Savings Account opening', amount: '1000.00', requirement: 'required' },
    ],
    checklist: checklist('minor_kyc', [
      ['birth_certificate', 'Birth certificate', 'required'],
      ['id_card', 'National identity card', 'optional'],
    ]),
    fields: fields('minor', [
      ['surname', 'Surname', 'text', [], 'applicant', true],
      ['name', 'Name', 'text', [], 'applicant', true],
      ['date_of_birth', 'Date of birth', 'date', [], 'applicant', true],
      ['gender', 'Gender', 'choice', GENDER, 'applicant', true],
      ['address', 'Address', 'text', [], 'applicant', true],
      ['nic', 'NIC', 'text', [], 'applicant', false],
      ['surname', 'Guardian surname', 'text', [], 'guardian', true],
      ['name', 'Guardian name', 'text', [], 'guardian', true],
      ['nic', 'Guardian NIC', 'text', [], 'guardian', true],
      ['member_id', 'Guardian Member ID', 'text', [], 'guardian', true],
      ['relationship', 'Relationship to minor', 'text', [], 'guardian', true],
      ['mobile', 'Guardian mobile', 'phone', [], 'guardian', true],
      ['surname', 'Successor guardian surname', 'text', [], 'nominee', true],
      ['name', 'Successor guardian name', 'text', [], 'nominee', true],
      ['nic', 'Successor guardian NIC', 'text', [], 'nominee', true],
      ['surname', 'Beneficiary surname', 'text', [], 'beneficiary', true],
      ['name', 'Beneficiary name', 'text', [], 'beneficiary', true],
      ['nic', 'Beneficiary NIC', 'text', [], 'beneficiary', true],
    ]),
  },
];
