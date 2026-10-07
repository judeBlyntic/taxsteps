import { COPY } from './copy.ts'

// Terms of Service and Privacy Policy, shared by the website (/terms, /privacy) and the phone app.
// Bump TERMS_VERSION (a date) whenever either document changes in substance: accounts record the
// version they agreed to (profiles.terms_version), so a new version can be offered for re-acceptance.
export const TERMS_VERSION = '2026-10-08'

export const OPERATOR = {
  name: 'Blyntic Ltd',
  country: 'New Zealand',
  email: 'jude@blyntic.co.nz',
  updated: '8 October 2026',
} as const

/** The one promise the sign-up tick box points to. Keep it true: see SERVICE_PROVIDERS. */
export const DATA_PROMISE =
  'Your business information belongs to you. Tax Steps does not own it, never sells it, and never shares it with anyone for their own purposes. ' +
  'The only companies that handle it are the service providers that run Tax Steps for us, and they may use it for that job alone.'

/** Advertising measurement on the public website only, loaded only after the visitor accepts. Never inside the app. */
export const AD_PARTNER = { name: 'Meta', tool: 'Meta Pixel', location: 'United States' } as const

/** Everyone outside Blyntic Ltd who handles user data. Every new integration must be added here. */
export const SERVICE_PROVIDERS: { name: string; role: string; location: string }[] = [
  { name: 'Supabase', role: 'Stores your account and expense records, and sends sign-in emails.', location: 'Sydney, Australia' },
  { name: 'Vercel', role: 'Hosts the Tax Steps website and web app.', location: 'United States' },
  {
    name: 'OpenAI',
    role: 'Reads each receipt photo you scan so the details can be filled in for you. Storage is switched off; OpenAI may keep the request for up to 30 days to check for abuse, then deletes it. It does not use it to train its models.',
    location: 'United States',
  },
  { name: 'Google', role: 'Only if you choose it: signing in with Google, or exporting to Google Sheets.', location: 'United States' },
]

export type LegalBlock = string | { list: string[] } | { providers: true }
export type LegalDoc = { slug: 'terms' | 'privacy'; title: string; summary: string; sections: { heading: string; body: LegalBlock[] }[] }

const contact = `email ${OPERATOR.email}`

export const PRIVACY: LegalDoc = {
  slug: 'privacy',
  title: 'Privacy Policy',
  summary: DATA_PROMISE,
  sections: [
    {
      heading: 'Who we are',
      body: [`Tax Steps is run by ${OPERATOR.name}, a company in ${OPERATOR.country}. We are responsible for the personal information described here. For anything about your privacy or your data, ${contact}.`],
    },
    {
      heading: 'What we collect',
      body: [
        'Only what Tax Steps needs to work:',
        {
          list: [
            'Your account: name, email address, and either a password (stored by Supabase in scrambled, one-way form; we never see it) or your Google sign-in.',
            'Your business details, if you add them: business name, tax or GST number, country, currency, time zone and tax year.',
            'The expense records you save: merchant, dates, amounts, tax, categories, notes and payment method.',
            'If you connect Google Sheets: your Google account email and an encrypted access key, so exports can reach your sheet.',
            'Technical basics: a sign-in cookie to keep you signed in, and short-lived security logs kept by our providers.',
          ],
        },
      ],
    },
    {
      heading: 'Receipt photos are never stored',
      body: [COPY.privacyPanel, COPY.providerNote],
    },
    {
      heading: 'How we use it',
      body: [
        'To run Tax Steps for you, and nothing else: showing your records, building reports and exports, keeping your devices in sync, keeping your account secure, and contacting you about your account or changes to these documents.',
        'We never use your business information or expense records for advertising, we do not build profiles of you, and we do not let anyone train AI models on it.',
      ],
    },
    {
      heading: 'Who handles your information',
      body: [
        'We never sell, rent or share your business information with anyone for their own purposes: not advertisers, not data brokers, not other businesses. These service providers run parts of Tax Steps for us and may use your information only to do that:',
        { providers: true },
        'We would only disclose information beyond this if the law requires it, and we would tell you unless the law prevents us. If Tax Steps is ever sold, we will tell you first, the new owner must keep these promises, and you can delete your account before anything moves.',
      ],
    },
    {
      heading: 'Where it is stored',
      body: ['Your records are stored in Sydney, Australia. The website and receipt reading run in the United States. We only use providers that protect information to a standard comparable to New Zealand’s Privacy Act 2020.'],
    },
    {
      heading: 'Cookies and advertising',
      body: [
        'Inside the app, Tax Steps uses a cookie only to keep you signed in, and your device remembers your chosen theme. There are no advertising or analytics trackers in the app, or on the sign-in and sign-up pages.',
        `On our public website only (the home page, these Terms and this Privacy Policy), we ask before using ${AD_PARTNER.name}'s advertising cookie (the ${AD_PARTNER.tool}). If you accept, ${AD_PARTNER.name} learns which website pages you visit, whether you click “Start free”, and basic details about your browser and device, so we can see which of our ads work. ${AD_PARTNER.name} handles this under its own terms and privacy policy, in the ${AD_PARTNER.location}. It never receives your account, business information or expense records. If you decline, it never loads. You can change your choice any time with “Cookie choices” at the bottom of the website.`,
      ],
    },
    {
      heading: 'How long we keep it',
      body: ['Until you delete it. Deleting a record removes it straight away, and deleting your account removes your profile, categories, records and Google connection from every device. Backups held by our database provider expire on their normal schedule.'],
    },
    {
      heading: 'Your rights',
      body: [
        'You can see, correct, export and delete your information yourself in Settings, including “Export all my data” and “Delete account”. You can also ask us for a copy or a correction by email.',
        'If you are unhappy with how we handle your information, tell us first. In New Zealand you can also complain to the Office of the Privacy Commissioner (privacy.org.nz). In the EU or UK you also have rights under the GDPR, including complaining to your local data protection authority.',
      ],
    },
    {
      heading: 'Security',
      body: ['Information is encrypted in transit, each account can only ever read its own records, Google access keys are encrypted, and receipt photos are never kept. No system is perfectly secure, so if something goes wrong we will tell affected users and the Privacy Commissioner as the law requires.'],
    },
    { heading: 'Children', body: ['Tax Steps is for people aged 16 and over.'] },
    {
      heading: 'Changes',
      body: [`If we change this policy in a meaningful way, we will update the date below and ask you to agree again. Questions: ${contact}.`],
    },
  ],
}

export const TERMS: LegalDoc = {
  slug: 'terms',
  title: 'Terms of Service',
  summary: `These terms are an agreement between you and ${OPERATOR.name} (${OPERATOR.country}), which runs Tax Steps. You accept them, together with our Privacy Policy, when you create an account or continue with Google. ${DATA_PROMISE}`,
  sections: [
    {
      heading: 'What Tax Steps does',
      body: [
        'Tax Steps helps you capture receipts and organise your expense records for tax time. It is a record-keeping tool, not a tax, accounting or legal service.',
        COPY.disclaimer,
        'Receipt reading is automated and can make mistakes. Please check each record before you save it and before you rely on it.',
      ],
    },
    {
      heading: 'Your account',
      body: ['You must be 16 or older and give accurate details. Keep your password private; you are responsible for activity on your account. Tell us straight away if you think someone else has accessed it.'],
    },
    {
      heading: 'Your information',
      body: [
        'You own everything you put into Tax Steps. You give us permission to store and process it only so we can run the service for you, as described in the Privacy Policy. That permission ends when you delete it.',
        'You can export or delete your information at any time in Settings.',
        'Tax laws usually require you to keep records for several years (seven in New Zealand). Tax Steps is not a substitute for keeping your own copies: export your records regularly.',
      ],
    },
    {
      heading: 'Using Tax Steps fairly',
      body: [
        'Please do not:',
        { list: ['use Tax Steps for anything unlawful or to create false records;', 'upload information you have no right to use;', 'try to access other people’s data, break our security, or overload or reverse-engineer the service.'] },
        'We may suspend accounts that do, and we will tell you why unless the law prevents it.',
      ],
    },
    {
      heading: 'Price',
      body: ['Tax Steps is free during early access. If we introduce paid plans, we will tell you well beforehand, and nothing will be charged unless you choose a plan.'],
    },
    {
      heading: 'Changes and availability',
      body: ['We keep improving Tax Steps, so features may change. We aim to keep it running smoothly but cannot promise it will always be available or error-free. If we ever close Tax Steps, we will give you reasonable notice and time to export your information.'],
    },
    {
      heading: 'Ending your account',
      body: ['You can delete your account at any time in Settings. We may close an account that breaks these terms, after telling you why where we can.'],
    },
    {
      heading: 'Liability',
      body: [
        'Tax Steps is provided “as is”. To the extent the law allows, we are not responsible for tax assessments, penalties or decisions you make using information in Tax Steps, or for indirect losses such as lost profits. Our total liability to you is limited to the amount you paid us in the 12 months before the claim.',
        'If you use Tax Steps for business, you agree that the Consumer Guarantees Act 1993 and sections 9, 12A and 13 of the Fair Trading Act 1986 do not apply, to the extent the law allows. Nothing in these terms limits rights that cannot be excluded by law.',
      ],
    },
    {
      heading: 'Changes to these terms',
      body: ['If we change these terms in a meaningful way, we will update the date below and ask you to agree again before you keep using Tax Steps.'],
    },
    {
      heading: 'Law and contact',
      body: [`These terms are governed by the laws of ${OPERATOR.country}, and the courts of ${OPERATOR.country} have jurisdiction. Questions: ${contact}.`],
    },
  ],
}

export const LEGAL_DOCS = { terms: TERMS, privacy: PRIVACY } as const
