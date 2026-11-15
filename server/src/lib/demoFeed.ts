/**
 * Demo monitoring feed.
 *
 * This is a LOCAL, human-authored fixture that exercises the extraction pipeline
 * without contacting any government system. It is NOT a government source and
 * every item is clearly labelled as illustrative. Extractions always require
 * human review before a scheme can be created or published.
 */
export const DEMO_FEED_VERSION = '2026-11-15';

export interface DemoFeedRule {
  field: string;
  operator: 'GTE' | 'LTE' | 'EQ' | 'NEQ' | 'IN' | 'CONTAINS' | 'EXISTS';
  value: unknown;
  descriptionEn: string;
  descriptionKn: string;
  isRequired: boolean;
}

export interface DemoFeedItem {
  externalId: string;
  titleEn: string;
  titleKn: string;
  summaryEn: string;
  summaryKn: string;
  descriptionEn: string;
  descriptionKn: string;
  department: string;
  level: 'CENTRAL' | 'STATE';
  state: string;
  categorySlug: string;
  benefitsEn: string;
  benefitsKn: string;
  eligibilityEn: string;
  eligibilityKn: string;
  requiredDocuments: string[];
  applicationProcessEn: string;
  applicationProcessKn: string;
  applicationUrl: string;
  officialUrl: string;
  rules: DemoFeedRule[];
}

export const demoFeedItems: DemoFeedItem[] = [
  {
    externalId: 'demo-millet-support-2026',
    titleEn: 'Demo Millet Cultivation Support (Illustrative)',
    titleKn: 'ಡೆಮೊ ಸಿರಿಧಾನ್ಯ ಕೃಷಿ ಬೆಂಬಲ (ಉದಾಹರಣೆ)',
    summaryEn:
      'Illustrative demo record used to test the monitoring pipeline. It is not a real government scheme or notification.',
    summaryKn:
      'ಮೇಲ್ವಿಚಾರಣಾ ವ್ಯವಸ್ಥೆಯನ್ನು ಪರೀಕ್ಷಿಸಲು ಬಳಸುವ ಉದಾಹರಣಾ ಡೆಮೊ ದಾಖಲೆ. ಇದು ನಿಜವಾದ ಸರ್ಕಾರಿ ಯೋಜನೆ ಅಥವಾ ಅಧಿಸೂಚನೆ ಅಲ್ಲ.',
    descriptionEn:
      'This record exists only to demonstrate how an extracted item moves from monitoring to human review. All amounts and rules are fictional and must never be shown to citizens as official information.',
    descriptionKn:
      'ಮೇಲ್ವಿಚಾರಣೆಯಿಂದ ಮಾನವ ಪರಿಶೀಲನೆಗೆ ದಾಖಲೆಯು ಹೇಗೆ ಚಲಿಸುತ್ತದೆ ಎಂಬುದನ್ನು ತೋರಿಸಲು ಮಾತ್ರ ಈ ದಾಖಲೆ ಇದೆ. ಎಲ್ಲಾ ಮೊತ್ತಗಳು ಮತ್ತು ನಿಯಮಗಳು ಕಾಲ್ಪನಿಕವಾಗಿದ್ದು, ಅಧಿಕೃತ ಮಾಹಿತಿಯಂತೆ ನಾಗರಿಕರಿಗೆ ತೋರಿಸಬಾರದು.',
    department: 'Demo Department of Agriculture (illustrative)',
    level: 'STATE',
    state: 'Karnataka',
    categorySlug: 'agriculture',
    benefitsEn: 'Illustrative demo benefit of INR 5,000 per hectare for millet cultivation.',
    benefitsKn: 'ಸಿರಿಧಾನ್ಯ ಕೃಷಿಗೆ ಹೆಕ್ಟೇರ್‌ಗೆ ₹5,000 ಎಂಬ ಉದಾಹರಣಾ ಡೆಮೊ ಪ್ರಯೋಜನ.',
    eligibilityEn: 'Illustrative rules only: age 18 or above and a resident of Karnataka.',
    eligibilityKn: 'ಉದಾಹರಣಾ ನಿಯಮಗಳು ಮಾತ್ರ: 18 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು ವಯಸ್ಸು ಮತ್ತು ಕರ್ನಾಟಕದ ನಿವಾಸಿ.',
    requiredDocuments: ['Demo identity document (not a real requirement)', 'Demo land record (illustrative)'],
    applicationProcessEn: 'Demo workflow step. Do not use this record to apply for any benefit.',
    applicationProcessKn: 'ಡೆಮೊ ಕಾರ್ಯವಿಧಾನದ ಹಂತ. ಯಾವುದೇ ಪ್ರಯೋಜನಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಈ ದಾಖಲೆಯನ್ನು ಬಳಸಬೇಡಿ.',
    applicationUrl: 'https://example.invalid/grama-sahay/demo-apply',
    officialUrl: 'https://example.invalid/grama-sahay/demo-feed#demo-millet-support-2026',
    rules: [
      {
        field: 'age',
        operator: 'GTE',
        value: 18,
        descriptionEn: 'Applicant must be at least 18 years old (demo rule).',
        descriptionKn: 'ಅರ್ಜಿದಾರರ ವಯಸ್ಸು ಕನಿಷ್ಠ 18 ವರ್ಷವಾಗಿರಬೇಕು (ಡೆಮೊ ನಿಯಮ).',
        isRequired: true,
      },
      {
        field: 'state',
        operator: 'EQ',
        value: 'Karnataka',
        descriptionEn: 'Applicant must reside in Karnataka (demo rule).',
        descriptionKn: 'ಅರ್ಜಿದಾರರು ಕರ್ನಾಟಕದಲ್ಲಿ ವಾಸಿಸಬೇಕು (ಡೆಮೊ ನಿಯಮ).',
        isRequired: true,
      },
    ],
  },
  {
    externalId: 'demo-artisan-grant-2026',
    titleEn: 'Demo Rural Artisan Tool Grant (Illustrative)',
    titleKn: 'ಡೆಮೊ ಗ್ರಾಮೀಣ ಕುಶಲಕರ್ಮಿ ಉಪಕರಣ ಅನುದಾನ (ಉದಾಹರಣೆ)',
    summaryEn:
      'Second illustrative demo record for pipeline testing. It is fictional and must remain unpublished until replaced by verified data.',
    summaryKn:
      'ಪೈಪ್‌ಲೈನ್ ಪರೀಕ್ಷೆಗಾಗಿ ಎರಡನೇ ಉದಾಹರಣಾ ಡೆಮೊ ದಾಖಲೆ. ಇದು ಕಾಲ್ಪನಿಕವಾಗಿದ್ದು ಪರಿಶೀಲಿತ ಮಾಹಿತಿಯಿಂದ ಬದಲಾಯಿಸುವವರೆಗೆ ಪ್ರಕಟಿಸಬಾರದು.',
    descriptionEn:
      'A fictitious grant for rural artisans, used only to verify extraction, review and scheme draft creation. No real application is accepted.',
    descriptionKn:
      'ಗ್ರಾಮೀಣ ಕುಶಲಕರ್ಮಿಗಳಿಗೆ ಕಾಲ್ಪನಿಕ ಅನುದಾನ; ಎಕ್ಸ್‌ಟ್ರಾಕ್ಷನ್, ಪರಿಶೀಲನೆ ಮತ್ತು ಯೋಜನಾ ಕರಡು ರಚನೆಯನ್ನು ಪರಿಶೀಲಿಸಲು ಮಾತ್ರ ಬಳಸಲಾಗುತ್ತದೆ. ನಿಜವಾದ ಅರ್ಜಿಯನ್ನು ಸ್ವೀಕರಿಸಲಾಗುವುದಿಲ್ಲ.',
    department: 'Demo Department of Rural Industries (illustrative)',
    level: 'STATE',
    state: 'Karnataka',
    categorySlug: 'small-business',
    benefitsEn: 'Illustrative demo tool grant of INR 10,000 for rural artisans.',
    benefitsKn: 'ಗ್ರಾಮೀಣ ಕುಶಲಕರ್ಮಿಗಳಿಗೆ ₹10,000 ಉದಾಹರಣಾ ಡೆಮೊ ಉಪಕರಣ ಅನುದಾನ.',
    eligibilityEn: 'Illustrative rules only: annual income up to INR 3,00,000 and artisan occupation.',
    eligibilityKn: 'ಉದಾಹರಣಾ ನಿಯಮಗಳು ಮಾತ್ರ: ವಾರ್ಷಿಕ ಆದಾಯ ₹3,00,000 ವರೆಗೆ ಮತ್ತು ಕುಶಲಕರ್ಮಿ ಉದ್ಯೋಗ.',
    requiredDocuments: ['Demo artisan certificate (illustrative)', 'Demo income declaration (not real)'],
    applicationProcessEn: 'Demo workflow step. This record cannot be used for a real application.',
    applicationProcessKn: 'ಡೆಮೊ ಕಾರ್ಯವಿಧಾನದ ಹಂತ. ನಿಜವಾದ ಅರ್ಜಿಗೆ ಈ ದಾಖಲೆಯನ್ನು ಬಳಸಲಾಗುವುದಿಲ್ಲ.',
    applicationUrl: 'https://example.invalid/grama-sahay/demo-artisan-apply',
    officialUrl: 'https://example.invalid/grama-sahay/demo-feed#demo-artisan-grant-2026',
    rules: [
      {
        field: 'annualIncome',
        operator: 'LTE',
        value: 300000,
        descriptionEn: 'Annual household income must not exceed INR 3,00,000 (demo rule).',
        descriptionKn: 'ವಾರ್ಷಿಕ ಕುಟುಂಬ ಆದಾಯ ₹3,00,000 ಮೀರಬಾರದು (ಡೆಮೊ ನಿಯಮ).',
        isRequired: true,
      },
      {
        field: 'occupation',
        operator: 'IN',
        value: ['ARTISAN', 'SELF_EMPLOYED'],
        descriptionEn: 'Applicant must be an artisan or self-employed (demo rule).',
        descriptionKn: 'ಅರ್ಜಿದಾರರು ಕುಶಲಕರ್ಮಿ ಅಥವಾ ಸ್ವಯಂ ಉದ್ಯೋಗಿಯಾಗಿರಬೇಕು (ಡೆಮೊ ನಿಯಮ).',
        isRequired: true,
      },
    ],
  },
];
