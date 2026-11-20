// Fixed product copy. Never retype these strings elsewhere.
export const COPY = {
  tagline: 'Tax Steps helps you organise and prepare your expense records for tax time.',
  disclaimer:
    'Tax Steps helps you organise and prepare your expense records for tax time. You are responsible for deciding whether an expense is deductible — please consult a qualified tax professional where appropriate.',
  photoPrivacy: 'Your photo is used only to extract the information. It is not stored after processing.',
  privacyPanel:
    'Receipt photos are never stored. We extract the details, then discard the image — no copies in our database, storage or logs.',
  aiConsentTitle: 'Read receipts with AI?',
  aiConsent:
    'To fill in the details for you, Tax Steps sends the receipt photo you take or choose, with your country, currency and category names, to OpenAI in the United States. OpenAI uses it only to read the receipt and does not train on it. It may keep the request for up to 30 days to check for abuse, then deletes it. Tax Steps never stores the photo.',
  providerNote:
    'Images are sent to our AI provider (OpenAI) for extraction with storage disabled; the provider may retain API inputs for up to 30 days for abuse monitoring.',
} as const
