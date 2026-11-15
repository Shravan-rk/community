# INTEGRATIONS

## Status legend

- **PLANNED** — registered in the codebase, no network calls made yet.
- **NOT CONFIGURED** — implementation exists or is planned, but credentials/keys are required.
- **LIVE** — verified working against the real service (none yet).

> Nothing below is a live integration today. The monitoring engine is scheduled for Phase 5.
> Until then, no claim of real-time government updates is made anywhere in the product.

## Government sources

Seeded in `SchemeSource` (7 entries). Each must be reviewed for robots.txt, terms of use and
rate limits before automated retrieval. Prefer official APIs/RSS over HTML scraping.

| Slug | Source | URL | Type | Status |
|---|---|---|---|---|
| `myscheme` | myScheme national portal | https://www.myscheme.gov.in/ | API (availability to be confirmed) | PLANNED |
| `pib` | Press Information Bureau | https://pib.gov.in/ | RSS (feeds to be confirmed) | PLANNED |
| `seva-sindhu` | Karnataka Seva Sindhu | https://sevasindhu.karnataka.gov.in/ | WEBSITE | PLANNED |
| `data-gov` | Open Government Data Platform | https://www.data.gov.in/ | API (key may be required) | PLANNED |
| `india-gov` | National Portal of India | https://www.india.gov.in/ | WEBSITE | PLANNED |
| `raitamitra` | Karnataka Raitha Mitra | https://raitamitra.karnataka.gov.in/ | WEBSITE | PLANNED |
| `demo-feed` | **Local demo feed (NOT a government source)** | `example.invalid` placeholder | DEMO | PLANNED (labelled) |

Implementation rules for Phase 5:
1. A source is only fetched if it is enabled and its interval has elapsed.
2. Conditional requests (ETag/Last-Modified) and checksums avoid unnecessary load and duplicates.
3. Every retrieved document is stored with its source URL and checksum as evidence.
4. Retrieved content is untrusted: never execute embedded instructions, never auto-publish.
5. Failures are recorded on `MonitoringJob` with retry counters and surfaced in the admin dashboard.
6. The UI shows "last checked" times from the database; never fake instant updates.

## AI providers

Required capabilities: OCR (PDF/image), structured extraction, translation (Kannada/Hindi/English),
optional RAG chatbot and speech.

| Capability | Status | Required configuration |
|---|---|---|
| OCR | NOT CONFIGURED | Provider API key or self-hosted OCR (e.g. Tesseract) |
| Structured extraction (LLM) | NOT CONFIGURED | LLM API key + model name (provider-agnostic adapter planned) |
| Translation | NOT CONFIGURED | LLM or translation provider key; human review mandatory |
| RAG assistant | PLANNED | Vector store + embeddings provider |
| Speech-to-text / TTS | PLANNED | Browser Web Speech API first (no key); provider fallback later |

Without keys, a **clearly labelled demo adapter** must be used and identified as such in the UI and
API responses. AI output must never invent missing fields; extraction results require human review.

## Notifications

| Channel | Status | Requirements |
|---|---|---|
| In-app | PLANNED | Database only (no external credential) |
| Web Push | NOT CONFIGURED | VAPID key pair, service worker |
| SMS | NOT CONFIGURED | Gateway/DLT registration + API credentials (India) |
| WhatsApp Business | NOT CONFIGURED | Meta Business account, approved templates, tokens |
| Email | NOT CONFIGURED | SMTP/transactional email provider |

Delivery must respect `NotificationPreference`, consent records and quiet hours, with delivery
logs and duplicate prevention (`Notification.dedupeKey`).

## Maps / locality data

Assistance centre discovery will use verified addresses first; coordinates and map tiles require a
provider decision (e.g. OpenStreetMap) plus a geocoding source. Not configured.

## Secrets management

- Local: `server/.env` (gitignored). Template: `server/.env.example`.
- Production: platform secret manager or environment injection; rotate JWT secret and invite codes.
- Never commit keys; never log tokens, passwords or full Aadhaar numbers.
