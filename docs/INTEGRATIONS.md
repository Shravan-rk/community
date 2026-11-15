# INTEGRATIONS

## Status legend

- **PLANNED** — registered in the codebase, no network calls made yet.
- **NOT CONFIGURED** — implementation exists or is planned, but credentials/keys are required.
- **LIVE** — verified working against the real service (none yet).

> Nothing below is a live integration today. Phase 5 added a monitoring pipeline, but only the
> local `DEMO` feed has an adapter. No government source is fetched and no AI provider is called.
> No claim of real-time government updates is made anywhere in the product.

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
| `demo-feed` | **Local demo feed (NOT a government source)** | `example.invalid` placeholder | DEMO | **DEMO ADAPTER** (local fixture, labelled, human review) |

Phase 5 status: sources are listed with an explicit `monitoring.canRun` flag. Only `demo-feed` can
run; all government sources return `409` with a reason until an approved integration exists.

Implementation rules for Phase 5:
1. A source is only fetched if it is enabled and its interval has elapsed (scheduler checks demo
   sources only; admin-triggered runs bypass the interval).
2. Conditional requests (ETag/Last-Modified) and checksums are not implemented yet and must be added
   with the first real adapter to avoid unnecessary load and duplicates.
3. Every retrieved document is stored with its source URL and external item ID as evidence; the demo
   feed additionally stores adapter name, feed version and fetch timestamp.
4. Retrieved content is untrusted: nothing is executed, nothing is auto-published, and every
   extraction requires human review before a scheme draft is created.
5. Adapter failures are recorded on `MonitoringJob` and `SchemeSource.lastError`. Retry/backoff
   counters are not implemented yet.
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

Current demo path: the local demo feed supplies authored English and Kannada fields. Approval creates
a `PENDING_VERIFICATION` scheme, inherits `isDemoData = true`, and stores the authored Kannada as a
`provider: DEMO`, `quality: DRAFT` translation. This is not machine translation and is not presented
as verified content. Real OCR/extraction/translation adapters remain **NOT CONFIGURED**.

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
