# Receipt App — Complete Product & Build Specification

## 1. Product Overview

Build a production-ready receipt management application for **Android, iOS, and Web**.

The core experience is:

> **SCAN → EXTRACT → REVIEW → SAVE → EXPORT**

Users photograph or upload a receipt. OCR/AI extracts the receipt information. The user reviews and corrects the information, then saves the structured receipt data.

### Critical privacy principle

The receipt photograph is **not permanently stored**.

The image may be held temporarily only for OCR/AI processing and must then be deleted. The database stores structured receipt information, not the receipt image.

The same account and receipt data must be available across:

- Android
- iOS
- Web

All three clients must use the same backend/database rather than separate databases.

---

# 2. Product Goals

The application should allow users to:

1. Create an account.
2. Select a subscription plan.
3. Start a free trial.
4. Add a supported payment method through a compliant payment provider.
5. Scan a receipt with the camera.
6. Upload a receipt image from the device.
7. Extract receipt information using OCR/AI.
8. Review and edit extracted information.
9. Save structured receipt data.
10. Permanently discard the temporary receipt image.
11. View receipts on a dashboard.
12. Search and filter receipts.
13. Edit and delete receipts.
14. Generate reports.
15. Export data to:
   - CSV
   - Microsoft Excel (.xlsx)
   - PDF
   - Google Sheets
16. Access the same data from Android, iOS, and Web.
17. Have changes synchronised between devices automatically.

---

# 3. Target Platforms

Build:

- Android app
- iOS app
- Responsive web application

Recommended mobile technology:

- React Native + Expo / Expo Router

Alternative:

- Flutter

Recommended web technology:

- Next.js / React

Recommended backend:

- Supabase/PostgreSQL, or
- PostgreSQL + secure API

The final technology choice should be based on reliability, security, OCR integration, authentication, real-time sync, exports, and subscription support.

---

# 4. High-Level Architecture

All clients must connect to the same backend and database.

```text
                    RECEIPT APP
                         |
          +--------------+--------------+
          |              |              |
        iOS           Android          Web
          |              |              |
          +--------------+--------------+
                         |
                  Authentication
                         |
                    Backend API
                         |
        +----------------+----------------+
        |                |                |
     Database         OCR/AI        Subscription
        |                |                |
        |                |       +--------+--------+
        |                |       |        |        |
        |                |     Apple    Google   Web
        |                |     Billing   Play   Billing
        |                |
        +----------------+----------------+
                         |
                    Receipt Data
                         |
          +--------------+--------------+
          |              |              |
      Dashboard       Reports        Exports
                                        |
                            +-----------+-----------+
                            |           |           |
                           CSV        Excel        PDF

                                      Google Sheets
```

### Important

Do **not** create separate databases for Android, iOS, and Web.

There is no traditional mobile-to-web sync system. Instead, all clients read and write the same central data source.

---

# 5. Authentication

Support:

- Email/password
- Google Sign-In
- Apple Sign-In on iOS
- Password reset
- Secure session management
- Account deletion

A single user identity must work across all platforms.

Example:

```text
User creates account on iPhone
        ↓
Logs into Web
        ↓
Same receipts appear
        ↓
Logs into Android
        ↓
Same receipts appear
```

---

# 6. Onboarding

First-time users should see a short onboarding sequence.

### Screen 1

**Track your receipts automatically**

"Take a photo and let AI extract the information for you."

### Screen 2

**Your receipt photo isn't stored**

"We process the photo to extract the information, then delete the image."

### Screen 3

**Everything organised in one place**

"Search, analyse and export your receipt data whenever you need it."

Then:

- Create Account
- Continue with Google
- Continue with Apple

---

# 7. Subscription Plans

The app uses a paid subscription model.

## Monthly

**$7.99/month**

## Annual

**$69.90/year**

The annual plan should clearly show that it provides a saving compared with paying monthly.

Pricing must be configurable from the backend rather than hard-coded throughout the application.

Example:

```text
Choose Your Plan

○ Monthly
  $7.99 / month

● Annual
  $69.90 / year
  Best value

[ Start Free Trial ]
```

Both plans provide the same core premium functionality unless a future product decision changes this.

---

# 8. Free Trial

New users receive a configurable free trial.

The exact trial duration must be controlled by backend/subscription configuration.

Example:

```text
Choose Plan
     ↓
Add Payment Method
     ↓
Free Trial Starts
     ↓
Use App
     ↓
Trial Ends
     ↓
Subscription Billing Starts
```

Clearly communicate:

> Your card will not be charged during the trial. Your subscription will begin and billing will start after your free trial ends unless you cancel before then.

The final wording must comply with the applicable payment-provider, Apple, Google, and consumer-law requirements.

---

# 9. Payment System

Use a PCI-compliant payment provider.

Do **not** create a custom backend that stores raw card numbers or CVV/security codes.

Potential providers:

- Stripe for Web
- Apple in-app subscriptions where required
- Google Play Billing where required
- RevenueCat or a similar subscription-management layer may be evaluated to normalise mobile subscription entitlements

Claude must verify the current Apple App Store, Google Play, Stripe, and relevant subscription requirements before implementation.

### Supported cards

At minimum:

- Visa
- Mastercard
- Other payment methods supported by the selected provider

---

# 10. Payment Data Security

Never store:

```text
Full card number
CVV
Card security code
Raw payment credentials
```

The backend may store safe payment-provider metadata such as:

```text
customer_id
subscription_id
plan_id
payment_status
subscription_status
trial_start
trial_end
current_period_start
current_period_end
cancel_at_period_end
card_brand
last_four_digits
```

Use the payment provider's secure SDK/checkout components.

---

# 11. Subscription Architecture

Conceptually:

```text
                  User
                   |
       +-----------+-----------+
       |           |           |
      iOS       Android       Web
       |           |           |
   Apple Billing  Google     Stripe/Web
                  Play
       |           |           |
       +-----------+-----------+
                   |
          Subscription Layer
                   |
                Backend
                   |
                Database
```

The backend must determine the user's entitlement.

Do not simply store:

```text
isPremium = true
```

in the mobile application.

Premium access must be validated against the backend/subscription provider.

---

# 12. Subscription States

Support:

```text
trialing
active
past_due
cancelled
expired
payment_failed
```

Example subscription record:

```json
{
  "user_id": "123",
  "plan": "annual",
  "status": "trialing",
  "trial_start": "2026-10-01",
  "trial_end": "2026-10-08",
  "subscription_id": "sub_xxxxx",
  "provider": "stripe",
  "provider_customer_id": "cus_xxxxx"
}
```

---

# 13. Subscription Webhooks

The backend should process provider events.

For Stripe, examples include:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Equivalent Apple/Google subscription events should be handled through the chosen subscription architecture.

Do not rely only on the client application to determine billing status.

---

# 14. Subscription Management

Create a **Subscription** section in Settings.

Display:

```text
Your Plan

Annual
$69.90/year

Status
Active

Next billing date
15 October 2026
```

Allow:

- Change plan
- Cancel subscription
- Update payment method
- View billing status
- View invoices
- Restore subscription
- Manage subscription

Use a secure hosted billing portal where appropriate.

---

# 15. Cancellation

If the user cancels:

```text
Your subscription has been cancelled.

You can continue using the application until:

[End Date]
```

Do not immediately delete receipt data.

Access should remain available according to the provider's subscription rules until the paid period ends.

---

# 16. Failed Payment

If payment fails:

> We couldn't process your payment.

Provide:

- Update Payment Method
- Manage Subscription

Update subscription state based on provider events.

---

# 17. Main Navigation

Use a simple navigation structure.

### Dashboard

Overview of expenses and recent receipts.

### Receipts

Complete receipt database.

### Scan

Primary receipt scanning action.

### Reports

Reports and exports.

### Settings

Account, subscription, integrations, privacy and configuration.

---

# 18. Dashboard

Display a date/month selector.

Example:

```text
September 2026

Total Expenses
$4,285.70

Receipts
47

GST
$558.35

Average Receipt
$91.19
```

Include:

- Total expenses
- Number of receipts
- GST/tax total
- Average receipt
- Business expenses
- Personal expenses

Charts:

- Expenses by month
- Expenses by category
- Expenses by vendor
- GST/tax summary

Keep charts simple and readable.

---

# 19. Scan Receipt

This is the primary feature.

User taps:

**Scan Receipt**

Then:

1. Open camera.
2. Detect receipt boundaries where possible.
3. Show alignment guide.
4. Capture image.
5. Crop automatically.
6. Correct perspective where practical.
7. Send temporary image to OCR/AI processing.
8. Extract structured information.
9. Display review screen.
10. User confirms/edits data.
11. Save structured data.
12. Delete temporary image.

Camera features:

- Receipt edge detection
- Auto capture where practical
- Manual capture
- Flash
- Alignment guide
- Retake
- Crop
- Rotate
- Perspective correction

Display:

> Place the entire receipt inside the frame.

---

# 20. Gallery Upload

Allow users to select a receipt from:

- Android Gallery
- iOS Photos
- Web file upload

The same temporary processing workflow applies.

The uploaded image must not become a permanent receipt attachment.

---

# 21. Receipt Privacy

This is a core product principle.

Processing flow:

```text
Camera / Gallery / Web Upload
            ↓
Temporary Image
            ↓
OCR + AI Processing
            ↓
Structured Receipt Data
            ↓
User Review
            ↓
Save Structured Data
            ↓
Delete Temporary Image
```

Requirements:

- Never permanently store receipt images.
- Temporary files must be private.
- Automatically delete successful uploads.
- Automatically purge abandoned/failed temporary uploads.
- Never expose receipt images through public URLs.
- Do not include receipt images in analytics.
- Do not include receipt images in crash reports.
- Do not log receipt images.
- Encrypt data in transit.
- Encrypt sensitive data at rest.
- Minimise personal information.

The user-facing message should clearly explain:

> Your receipt photo is used only to extract the information. The photo is not stored after processing.

---

# 22. OCR / AI Extraction

Extract as much information as possible.

### Core fields

```text
Receipt ID
Vendor Name
Vendor Address
Vendor Phone
Receipt Number
Transaction Date
Transaction Time
Currency
Subtotal
GST
Tax
Total
Payment Method
Category
Description
Business/Personal
Tax Deductible
Notes
Confidence Score
Created Date
```

### Optional fields

```text
ABN / Business Number
GST Number
Items
Item Description
Quantity
Unit Price
Item Total
Discount
Tip
Purchase Location
```

The AI must never invent missing information.

If a value cannot be confidently extracted:

- Return null/blank.
- Flag it for review.
- Ask the user to confirm it.

---

# 23. OCR JSON Format

The OCR service should return structured JSON.

```json
{
  "vendor_name": "",
  "vendor_address": "",
  "vendor_phone": "",
  "receipt_number": "",
  "transaction_date": "",
  "transaction_time": "",
  "currency": "NZD",
  "subtotal": null,
  "gst": null,
  "tax": null,
  "total": null,
  "payment_method": "",
  "category": "",
  "description": "",
  "business_personal": "unknown",
  "tax_deductible": null,
  "items": [],
  "confidence": {
    "vendor_name": 0,
    "date": 0,
    "subtotal": 0,
    "gst": 0,
    "total": 0
  }
}
```

---

# 24. OCR Architecture

Create an abstraction layer so the OCR provider can be replaced later.

```text
ReceiptProcessor
       ↓
OCR Provider
       ↓
Structured JSON
       ↓
Validation
       ↓
User Review
       ↓
Database
```

Potential OCR providers:

- Google Vision
- AWS Textract
- Azure Document Intelligence
- OpenAI vision-capable model
- On-device OCR

Do not tightly couple the application to one provider.

---

# 25. Receipt Review Screen

After scanning, display extracted information.

Example:

```text
Receipt Found

Vendor
Mitre 10

Date
25/09/2026

Receipt #
548921

Subtotal
$100.00

GST
$15.00

Total
$115.00

Payment
Visa

Category
Tools & Equipment
```

Every field must be editable.

Buttons:

- Save Receipt
- Scan Again

---

# 26. Confidence / Review

Show confidence indicators where useful.

Example:

```text
Vendor       ✓ High confidence
Date         ✓ High confidence
Total        ⚠ Review
GST          ⚠ Review
Category     ✓ High confidence
```

If an important financial value is uncertain, prominently ask the user to verify it.

---

# 27. Receipt Database

Store structured receipt information.

Example:

```json
{
  "id": "receipt_12345",
  "vendor": "Mitre 10",
  "receipt_number": "548921",
  "date": "2026-09-25",
  "currency": "NZD",
  "subtotal": 100.00,
  "gst": 15.00,
  "total": 115.00,
  "payment_method": "Visa",
  "category": "Tools & Equipment",
  "description": "Tools and equipment",
  "business_personal": "business",
  "tax_deductible": true,
  "notes": "",
  "ocr_confidence": 0.94,
  "created_at": "2026-09-25T15:42:00Z",
  "updated_at": "2026-09-25T15:42:00Z"
}
```

Do not include:

```text
receipt_image_url
permanent_image_path
```

---

# 28. Receipt List

Display receipts in a clean list.

Example:

```text
25 Sep 2026
Mitre 10
Tools & Equipment
$115.00

24 Sep 2026
BP
Fuel
$82.40

22 Sep 2026
OfficeMax
Office Supplies
$64.99
```

Support:

- Search
- Sort
- Filter
- Edit
- Delete
- Bulk selection

---

# 29. Search

Search by:

- Vendor
- Receipt number
- Category
- Description
- Notes
- Amount
- Date

---

# 30. Filters

### Date

- Today
- This week
- This month
- Last month
- This year
- Custom range

### Category

- Food
- Fuel
- Travel
- Accommodation
- Office
- Tools
- Equipment
- Software
- Advertising
- Vehicle
- Other

Categories must be customisable.

### Business/Personal

- All
- Business
- Personal

### Tax

- All
- Tax deductible
- Non-deductible

### Vendor

Selectable vendor list.

---

# 31. Categories

Allow users to:

- Add category
- Rename category
- Delete category
- Set default category

Example categories:

```text
Office
Fuel
Travel
Meals
Advertising
Software
Tools
Equipment
Insurance
Professional Services
Other
```

---

# 32. Vendor Management

Automatically create vendors from receipt data.

Users can edit vendor names.

---

# 33. Manual Receipt Entry

Allow users to add a receipt without scanning.

Fields:

- Vendor
- Date
- Receipt number
- Category
- Subtotal
- GST
- Total
- Payment method
- Business/personal
- Tax deductible
- Notes

Button:

**Save Receipt**

---

# 34. New Zealand GST Support

Default currency:

**NZD**

Support GST fields.

Example:

```text
Subtotal: $100.00
GST: $15.00
Total: $115.00
```

Do not assume every receipt contains GST.

GST must be editable.

GST rules should be configurable rather than hard-coded.

---

# 35. Currency

Support:

- NZD
- AUD
- USD
- GBP
- EUR
- CAD
- Other

Store currency with every receipt.

---

# 36. Reports

Allow users to select:

- Date range
- Category
- Vendor
- Business/Personal
- Tax deductible
- Currency

Generate:

### Expense Summary

```text
September 2026

Total Expenses: $4,285.70
Receipts: 47
GST: $558.35

Categories

Fuel             $850.00
Office           $620.00
Tools            $1,240.00
Meals            $385.70
Travel           $1,190.00
```

---

# 37. CSV Export

Export structured receipt data.

Suggested columns:

```text
Receipt ID
Date
Time
Vendor
Receipt Number
Category
Description
Subtotal
GST
Total
Currency
Payment Method
Business/Personal
Tax Deductible
Notes
```

Allow date-range and filter selection before exporting.

---

# 38. Microsoft Excel Export

Generate a professional `.xlsx` file.

### Sheet 1 — Receipts

All receipt records.

### Sheet 2 — Summary

Totals by:

- Month
- Category
- Vendor
- GST

### Sheet 3 — Categories

Category totals.

The Excel file should be usable by an accountant.

---

# 39. PDF Export

Generate a professional PDF report.

Example:

```text
RECEIPT EXPENSE REPORT

Business:
ABC Limited

Period:
1 September 2026 – 30 September 2026

Total Expenses:
$4,285.70

GST:
$558.35

Number of Receipts:
47
```

Then:

```text
Date | Vendor | Category | GST | Total
```

At the bottom:

```text
Total Expenses
Total GST
Number of Receipts
```

Do not include receipt images.

---

# 40. Google Sheets Integration

Add:

**Connect Google Sheets**

Use secure Google OAuth.

Allow:

1. Select an existing spreadsheet, or
2. Create a new spreadsheet.

Example:

```text
Receipt Tracker 2026
```

Columns:

```text
Date
Vendor
Receipt Number
Category
Subtotal
GST
Total
Currency
Payment Method
Business/Personal
Tax Deductible
Notes
```

Support:

**Export to Google Sheets**

Optional future feature:

**Auto-sync new receipts**

When enabled, every new receipt becomes a new spreadsheet row.

Use minimum required OAuth permissions.

---

# 41. Web Application

The web app must provide the same account and receipt data as Android/iOS.

### Web Dashboard

Include:

- Total expenses
- Receipt count
- GST/tax
- Monthly expenses
- Category breakdown
- Recent receipts
- Charts

### Web Receipts

Users can:

- View
- Search
- Filter
- Edit
- Delete
- Add manually

### Web Reports

Users can:

- Select date range
- Filter categories
- Generate reports
- Export CSV
- Export Excel
- Export PDF

### Web Integrations

- Google Sheets
- Subscription
- Account settings
- Privacy

---

# 42. Real-Time Synchronisation

Changes made on any platform must be reflected on the others.

Example:

```text
Android
Bunnings
$124.50
Tools
       ↓
Backend
       ↓
Database
       ↓
Web + iOS
```

If the web user changes:

```text
Tools
```

to:

```text
Equipment
```

the updated value must appear on Android and iOS.

Use:

- Automatic sync
- Server-side validation
- Secure authentication
- Offline caching where appropriate
- Last-updated timestamps
- Conflict handling
- Optimistic UI where appropriate

Each record must have:

```text
created_at
updated_at
```

Optionally:

```text
version
```

for conflict resolution.

---

# 43. Offline Support

Users should be able to:

- View previously downloaded receipt data.
- Browse the dashboard.
- Add/edit receipt records manually.

OCR normally requires an internet connection unless on-device OCR is implemented.

If offline:

> You're offline. You can enter this receipt manually or try scanning again when you're connected.

Queued changes should sync when connectivity returns, with conflict handling.

---

# 44. Duplicate Receipt Detection

Before saving, compare:

- Vendor
- Date
- Total
- Receipt number

If a likely duplicate is detected:

> This receipt looks similar to an existing receipt.

Options:

- Save Anyway
- Cancel

---

# 45. Settings

### Account

- Name
- Email
- Profile

### Business

- Business name
- Business number
- Default currency
- Default category

### Receipt

- Default payment method
- Default category
- GST settings

### Subscription

- Current plan
- Billing status
- Trial status
- Next billing date
- Change plan
- Cancel
- Payment method
- Billing portal

### Integrations

- Google Sheets
- Google account

### Export

- Date format
- Default CSV format
- Excel
- PDF

### Privacy

- Privacy policy
- Delete account
- Delete all receipt data
- Export all data

Clearly explain:

> Receipt photos are not permanently stored.

---

# 46. Security & Privacy

Requirements:

- HTTPS/TLS for all network traffic.
- Secure authentication.
- Encrypt sensitive data at rest.
- Use environment variables for secrets.
- Never hard-code API keys.
- Never store raw card data.
- Never permanently store receipt images.
- Do not log sensitive receipt information unnecessarily.
- Do not send receipt images to analytics.
- Implement account/data deletion.
- Implement receipt deletion.
- Use least-privilege OAuth permissions.
- Use private temporary image storage if temporary storage is technically required.
- Automatically expire/delete temporary files.
- Validate all backend requests.

---

# 47. Data Model

## users

```text
id
name
email
created_at
updated_at
```

## receipts

```text
id
user_id
vendor_name
vendor_address
vendor_phone
receipt_number
transaction_date
transaction_time
currency
subtotal
gst
tax
total
payment_method
category_id
description
business_personal
tax_deductible
notes
ocr_confidence
created_at
updated_at
version
```

## receipt_items

```text
id
receipt_id
description
quantity
unit_price
total
```

## categories

```text
id
user_id
name
created_at
updated_at
```

## vendors

```text
id
user_id
name
created_at
updated_at
```

## subscriptions

```text
id
user_id
provider
provider_customer_id
provider_subscription_id
plan_id
status
trial_start
trial_end
current_period_start
current_period_end
cancel_at_period_end
created_at
updated_at
```

## plans

```text
id
name
billing_period
price
currency
trial_days
provider_product_id
provider_price_id
active
created_at
updated_at
```

---

# 48. Web/Mobile API Architecture

Create a secure API layer used by all clients.

Example endpoints:

```text
POST   /auth/signup
POST   /auth/login
POST   /auth/logout

GET    /user
PATCH  /user
DELETE /user

GET    /receipts
POST   /receipts
GET    /receipts/:id
PATCH  /receipts/:id
DELETE /receipts/:id

POST   /receipts/process
POST   /receipts/manual

GET    /categories
POST   /categories
PATCH  /categories/:id
DELETE /categories/:id

GET    /vendors

GET    /reports
POST   /exports/csv
POST   /exports/excel
POST   /exports/pdf

POST   /google-sheets/connect
POST   /google-sheets/export

GET    /subscription
POST   /subscription/change
POST   /subscription/cancel

POST   /webhooks/stripe
POST   /webhooks/apple
POST   /webhooks/google
```

Exact API design may be adjusted during architecture review.

---

# 49. Design Direction

The app should feel like a modern financial SaaS product.

Style:

- Clean
- Modern
- Professional
- Minimal
- Light background
- Strong typography
- Rounded cards
- Clear financial numbers
- Large Scan button
- Simple icons
- Optional dark mode

Do not make the application look like traditional accounting software.

The primary action should always be obvious:

**SCAN RECEIPT**

The user should be able to scan a receipt in approximately three actions:

```text
Open app
↓
Scan Receipt
↓
Confirm
```

---

# 50. Error Handling

If OCR fails:

> We couldn't read this receipt clearly.

Options:

- Try Again
- Enter Manually

If some fields are missing:

> We found most of the receipt information. Please check the highlighted fields.

If the image is blurry:

> Please take another photo with better lighting and make sure the receipt is flat.

Handle:

- Camera permission denied
- Photo library permission denied
- Network failure
- OCR timeout
- OCR provider failure
- Payment failure
- Google OAuth failure
- Export failure
- Database failure
- Session expiration
- Offline mode

Every failure must have a useful user-facing message.

---

# 51. Competitor Reference — Easy Expense

Use Easy Expense as a functional reference, not something to copy.

Reference:

- Google Play listing:
  https://play.google.com/store/apps/details?id=com.easyexpense&hl=en

- Website:
  https://www.easy-expense.com/

Easy Expense provides features such as receipt scanning, OCR extraction, categorisation, reports, cloud synchronisation and CSV/Excel/PDF exports, along with additional features such as email receipt importing, mileage tracking, bank/credit-card related functionality and team/workspace features.

The product should not copy:

- Branding
- UI
- Text
- Code
- Proprietary implementation
- Visual identity

The MVP should remain focused.

### Core differentiation

```text
Receipt photo
      ↓
AI/OCR extraction
      ↓
Structured data
      ↓
Temporary photo deleted
      ↓
Dashboard
      ↓
Export
```

Privacy-first receipt processing should be a central product principle.

---

# 52. MVP Scope

Build these features first:

1. Authentication
2. Onboarding
3. Subscription plans
4. Free trial
5. Compliant payment setup
6. Dashboard
7. Camera receipt scanning
8. Gallery upload
9. Web receipt upload
10. OCR/AI extraction
11. Receipt review/edit
12. Structured receipt storage
13. Receipt image deletion
14. Receipt list
15. Search
16. Filters
17. Categories
18. Manual entry
19. CSV export
20. Excel export
21. PDF export
22. Web application
23. Android application
24. iOS application
25. Shared backend/database
26. Cross-platform synchronisation
27. Google Sheets integration
28. Subscription management
29. Privacy controls
30. Account/data deletion

---

# 53. Phase 2 Features

Do not add these to the initial MVP unless specifically requested:

- Mileage tracking
- Bank account connections
- Credit card transaction connections
- Automatic bank transaction matching
- Email inbox receipt scanning
- Team approval workflows
- Invoicing
- Payroll
- Full bookkeeping
- Multiple businesses
- Accountant collaboration
- Advanced accounting integrations

Possible future features:

- Email receipt forwarding
- Automatic recurring reports
- Accountant sharing
- Team workspaces
- Multi-business support
- Advanced tax reports
- Accounting software integrations

---

# 54. Testing Requirements

## Receipt OCR Testing

Test:

- NZD
- USD
- AUD
- Different date formats
- GST receipts
- Receipts without GST
- Multiple tax lines
- Multiple items
- Long receipts
- Crumpled receipts
- Blurry images
- Low-light images
- Receipts with handwritten notes
- Receipts with missing fields

## Database Testing

Test:

- Create
- Read
- Update
- Delete
- Search
- Filtering
- Duplicate detection
- Sync conflicts

## Export Testing

Test:

- CSV
- XLSX
- PDF
- Google Sheets

Verify exported totals match the database.

## Subscription Testing

Test:

- New subscription
- Free trial
- Trial expiry
- Monthly plan
- Annual plan
- Payment success
- Payment failure
- Cancellation
- Renewal
- Restore subscription
- Change plan
- Cross-platform entitlement

## Privacy Testing

Verify:

- Receipt images are not permanently stored.
- Temporary images are deleted.
- No public image URLs remain.
- Logs do not contain receipt images.
- Analytics do not contain receipt images.
- Deleted data is actually removed.
- Account deletion works.

## Cross-Platform Testing

Test:

```text
Android → Web
Android → iOS
iOS → Web
iOS → Android
Web → Android
Web → iOS
```

Create/edit/delete a receipt on each platform and verify the other platforms receive the change.

---

# 55. Development Process

Do not attempt to generate the entire application blindly in one step.

## Step 1 — Architecture

First analyse this specification and provide:

1. Recommended technology stack.
2. Architecture diagram.
3. Database schema.
4. API architecture.
5. Authentication architecture.
6. OCR/AI architecture.
7. Temporary image deletion architecture.
8. Subscription/payment architecture.
9. Apple billing architecture.
10. Google Play billing architecture.
11. Web billing architecture.
12. Cross-platform sync architecture.
13. Google Sheets OAuth architecture.
14. Export architecture.
15. Security model.
16. Project folder structure.
17. External services required.
18. API keys/credentials required.

## Step 2 — Confirm architecture

Before generating the entire application, identify technical decisions that require approval.

## Step 3 — Build incrementally

Build:

1. Project setup
2. Authentication
3. Database
4. Subscription
5. Dashboard
6. Camera scanner
7. OCR
8. Receipt review
9. Receipt database
10. Search/filter
11. Exports
12. Google Sheets
13. Web app
14. Sync
15. Security/privacy
16. Testing
17. Production builds

Keep the application runnable after every major stage.

---

# 56. Claude Engineering Rules

Claude is acting as a senior mobile, web and full-stack engineer.

Do not create a fake/demo-only application.

Use production-ready foundations.

Requirements:

- Real authentication
- Real database
- Real OCR integration abstraction
- Real exports
- Real Google Sheets integration
- Real subscription architecture
- Real payment integration
- Real synchronisation
- Real error handling
- Real deletion
- Secure API architecture
- Environment variables
- No hard-coded secrets
- No production fake data
- Loading states
- Empty states
- Error states
- Permission handling
- Offline handling where appropriate

Do not replace working code unnecessarily.

Clearly identify any API keys or credentials that the user must provide.

Provide:

- Setup instructions
- Environment variable template
- Database migrations
- API documentation
- Testing instructions
- Android build instructions
- iOS build instructions
- Web deployment instructions

---

# 57. Important Billing Instruction

Before implementing subscriptions, Claude must verify the current requirements for:

- Apple App Store
- Google Play
- Stripe
- RevenueCat, if selected

Do not assume that a web Stripe subscription can replace Apple or Google in-app billing where platform rules require their billing systems.

The final architecture must be compliant with the applicable platform rules.

---

# 58. Definition of Done

The MVP is complete when a real user can:

1. Install the Android app.
2. Install the iOS app.
3. Open the Web app.
4. Create one account.
5. Choose Monthly ($7.99/month) or Annual ($69.90/year).
6. Add a supported payment method through the appropriate secure payment flow.
7. Start a free trial.
8. Clearly understand when billing will begin.
9. Scan a real receipt.
10. Have AI/OCR extract the receipt information.
11. Review and correct the extracted information.
12. Save the receipt.
13. Confirm the receipt image is not permanently stored.
14. See the receipt on the dashboard.
15. Search for it later.
16. Filter receipts.
17. Edit it.
18. Delete it.
19. Export receipts to CSV.
20. Export receipts to Excel.
21. Generate a PDF report.
22. Connect Google Sheets.
23. Export/sync receipt data to Google Sheets.
24. Log into the Web app and see the same receipts.
25. Edit a receipt on the Web app and see the change on mobile.
26. Add a receipt on Android and see it on iOS/Web.
27. Manage the subscription.
28. Cancel the subscription.
29. Delete the account and associated receipt data.

The complete core experience must remain:

> **SCAN → EXTRACT → REVIEW → SAVE → SYNC → EXPORT**
