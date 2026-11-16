/**
 * GRAMA SAHAY seed data.
 *
 * IMPORTANT: Scheme records below are illustrative seed records (`isDemoData: true`)
 * based on publicly known schemes. They are NOT official notifications. Every field
 * must be re-verified against the linked official government source before publication.
 * Kannada translations are AI drafts (quality = DRAFT) and require human review.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

const categories = [
  { slug: 'agriculture', nameEn: 'Agriculture', nameKn: 'ಕೃಷಿ', nameHi: 'कृषि', icon: 'Sprout' },
  { slug: 'education', nameEn: 'Education', nameKn: 'ಶಿಕ್ಷಣ', nameHi: 'शिक्षा', icon: 'GraduationCap' },
  { slug: 'employment', nameEn: 'Employment', nameKn: 'ಉದ್ಯೋಗ', nameHi: 'रोजगार', icon: 'Briefcase' },
  { slug: 'women-empowerment', nameEn: 'Women Empowerment', nameKn: 'ಮಹಿಳಾ ಸಬಲೀಕರಣ', nameHi: 'महिला सशक्तिकरण', icon: 'Users' },
  { slug: 'healthcare', nameEn: 'Healthcare', nameKn: 'ಆರೋಗ್ಯ ರಕ್ಷಣೆ', nameHi: 'स्वास्थ्य सेवा', icon: 'HeartPulse' },
  { slug: 'housing', nameEn: 'Housing', nameKn: 'ವಸತಿ', nameHi: 'आवास', icon: 'House' },
  { slug: 'financial-assistance', nameEn: 'Financial Assistance', nameKn: 'ಆರ್ಥಿಕ ಸಹಾಯ', nameHi: 'वित्तीय सहायता', icon: 'IndianRupee' },
  { slug: 'small-business', nameEn: 'Small Businesses', nameKn: 'ಸಣ್ಣ ಉದ್ಯಮಗಳು', nameHi: 'लघु व्यवसाय', icon: 'Store' },
  { slug: 'rural-development', nameEn: 'Rural Development', nameKn: 'ಗ್ರಾಮೀಣ ಅಭಿವೃದ್ಧಿ', nameHi: 'ग्रामीण विकास', icon: 'Trees' },
  { slug: 'social-welfare', nameEn: 'Social Welfare', nameKn: 'ಸಾಮಾಜಿಕ ಕಲ್ಯಾಣ', nameHi: 'समाज कल्याण', icon: 'HeartHandshake' },
  { slug: 'senior-citizens', nameEn: 'Senior Citizens', nameKn: 'ಹಿರಿಯ ನಾಗರಿಕರು', nameHi: 'वरिष्ठ नागरिक', icon: 'PersonStanding' },
  { slug: 'disability-support', nameEn: 'Disability Support', nameKn: 'ಅಂಗವಿಕಲರ ಬೆಂಬಲ', nameHi: 'दिव्यांग सहायता', icon: 'Accessibility' },
  { slug: 'animal-husbandry', nameEn: 'Animal Husbandry', nameKn: 'ಪಶುಸಂಗೋಪನೆ', nameHi: 'पशुपालन', icon: 'Bird' },
  { slug: 'dairy-livestock', nameEn: 'Dairy and Livestock', nameKn: 'ಹಾಲು ಮತ್ತು ಪಶುಸಂಪತ್ತು', nameHi: 'डेयरी और पशुधन', icon: 'Milk' },
  { slug: 'skill-development', nameEn: 'Skill Development', nameKn: 'ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ', nameHi: 'कौशल विकास', icon: 'Wrench' },
  { slug: 'youth-entrepreneurship', nameEn: 'Youth Entrepreneurship', nameKn: 'ಯುವ ಉದ್ಯಮಶೀಲತೆ', nameHi: 'युवा उद्यमशीलता', icon: 'Rocket' },
];

const sources = [
  { slug: 'myscheme', name: 'myScheme (National Scheme Portal)', baseUrl: 'https://www.myscheme.gov.in/', sourceType: 'API', reliabilityScore: 80 },
  { slug: 'pib', name: 'Press Information Bureau', baseUrl: 'https://pib.gov.in/', sourceType: 'RSS', reliabilityScore: 80 },
  { slug: 'seva-sindhu', name: 'Karnataka Seva Sindhu', baseUrl: 'https://sevasindhu.karnataka.gov.in/', sourceType: 'WEBSITE', reliabilityScore: 80 },
  { slug: 'data-gov', name: 'Open Government Data Platform India', baseUrl: 'https://www.data.gov.in/', sourceType: 'API', reliabilityScore: 75 },
  { slug: 'india-gov', name: 'National Portal of India', baseUrl: 'https://www.india.gov.in/', sourceType: 'WEBSITE', reliabilityScore: 75 },
  { slug: 'raitamitra', name: 'Karnataka Raitha Mitra', baseUrl: 'https://raitamitra.karnataka.gov.in/', sourceType: 'WEBSITE', reliabilityScore: 70 },
  { slug: 'demo-feed', name: 'Local demo feed (NOT a government source)', baseUrl: 'https://example.invalid/grama-sahay/demo-feed.json', sourceType: 'DEMO', reliabilityScore: 0 },
];

type Rule = {
  field: string;
  operator: string;
  value: string | number | boolean | string[];
  descriptionEn: string;
  descriptionKn: string;
};

type SchemeSeed = {
  slug: string;
  titleEn: string;
  titleKn: string;
  titleHi?: string;
  summaryEn: string;
  summaryKn: string;
  benefitsEn: string;
  benefitsKn: string;
  eligibilityEn: string;
  eligibilityKn: string;
  department: string;
  level: 'CENTRAL' | 'STATE';
  category: string;
  source: string;
  applicationUrl: string;
  officialUrl: string;
  requiredDocuments: string[];
  applicationProcessEn: string;
  applicationProcessKn: string;
  status: 'PUBLISHED' | 'PENDING_VERIFICATION';
  rules: Rule[];
};

const schemes: SchemeSeed[] = [
  {
    slug: 'pm-kisan',
    titleEn: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    titleKn: 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ (ಪಿಎಂ-ಕಿಸಾನ್)',
    titleHi: 'प्रधान मंत्री किसान सम्मान निधि (पीएम-किसान)',
    summaryEn:
      'Income support of ₹6,000 per year, paid in three instalments, to eligible landholding farmer families.',
    summaryKn:
      'ಅರ್ಹ ಭೂಹಿಡುವಳಿದಾರ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ವರ್ಷಕ್ಕೆ ₹6,000 ಆದಾಯ ಬೆಂಬಲವನ್ನು ಮೂರು ಕಂತುಗಳಲ್ಲಿ ನೀಡಲಾಗುತ್ತದೆ.',
    benefitsEn:
      "₹6,000 per year in three instalments of ₹2,000, credited directly to the farmer's bank account.",
    benefitsKn: 'ವರ್ಷಕ್ಕೆ ₹6,000, ತಲಾ ₹2,000 ಮೂರು ಕಂತುಗಳಲ್ಲಿ ರೈತರ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ನೇರವಾಗಿ ಜಮೆಯಾಗುತ್ತದೆ.',
    eligibilityEn:
      'Landholding farmer families as per state land records. Certain categories such as income-tax payers and government employees are excluded as notified.',
    eligibilityKn:
      'ರಾಜ್ಯದ ಭೂ ದಾಖಲೆಗಳ ಪ್ರಕಾರ ಭೂಹಿಡುವಳಿದಾರ ರೈತ ಕುಟುಂಬಗಳು ಅರ್ಹರು. ಆದಾಯ ತೆರಿಗೆ ಪಾವತಿಸುವವರು, ಸರ್ಕಾರಿ ನೌಕರರು ಮುಂತಾದ ಕೆಲವು ವರ್ಗಗಳು ಹೊರತುಪಡಿಸಲಾಗಿದೆ.',
    department: 'Ministry of Agriculture and Farmers Welfare',
    level: 'CENTRAL',
    category: 'agriculture',
    source: 'myscheme',
    applicationUrl: 'https://www.pmkisan.gov.in/',
    officialUrl: 'https://www.pmkisan.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Land ownership records', 'Bank account details', 'Mobile number'],
    applicationProcessEn:
      'Register or check status on the official PM-KISAN portal, or visit the nearest Common Service Centre (CSC) or agriculture office.',
    applicationProcessKn:
      'ಅಧಿಕೃತ ಪಿಎಂ-ಕಿಸಾನ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನೋಂದಣಿ ಮಾಡಿ ಅಥವಾ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ, ಅಥವಾ ಹತ್ತಿರದ ಸೇವಾ ಕೇಂದ್ರ (ಸಿಎಸ್‌ಸಿ) ಅಥವಾ ಕೃಷಿ ಕಚೇರಿಗೆ ಭೇಟಿ ನೀಡಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'occupation', operator: 'EQ', value: 'FARMER', descriptionEn: 'Applicant is a farmer', descriptionKn: 'ಅರ್ಜಿದಾರರು ರೈತರಾಗಿರಬೇಕು' },
    ],
  },
  {
    slug: 'ayushman-bharat-pmjay',
    titleEn: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)',
    titleKn: 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಪ್ರಧಾನ ಮಂತ್ರಿ ಜನ ಆರೋಗ್ಯ ಯೋಜನೆ (ಪಿಎಂ-ಜಯ್)',
    summaryEn: 'Health cover of up to ₹5 lakh per family per year for secondary and tertiary hospitalisation.',
    summaryKn: 'ಪ್ರತಿ ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ ₹5 ಲಕ್ಷದವರೆಗೆ ದ್ವಿತೀಯ ಮತ್ತು ತೃತೀಯ ಹಂತದ ಆಸ್ಪತ್ರೆ ಚಿಕಿತ್ಸೆಗೆ ಆರೋಗ್ಯ ರಕ್ಷಣೆ.',
    benefitsEn:
      'Cashless hospitalisation up to ₹5 lakh per family per year at empanelled hospitals, as per scheme guidelines.',
    benefitsKn: 'ಯೋಜನೆಯ ಮಾರ್ಗಸೂಚಿಗಳಂತೆ ಪಟ್ಟಿ ಮಾಡಿದ ಆಸ್ಪತ್ರೆಗಳಲ್ಲಿ ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ ₹5 ಲಕ್ಷದವರೆಗೆ ನಗದು ರಹಿತ ಚಿಕಿತ್ಸೆ.',
    eligibilityEn:
      'Families identified under SECC deprivation and occupational categories as notified. Verify eligibility on the official portal before applying.',
    eligibilityKn:
      'ಅಧಿಸೂಚಿಸಿದ ಎಸ್‌ಇಸಿಸಿ ವಂಚಿತ ಮತ್ತು ವೃತ್ತಿ ವರ್ಗಗಳಡಿ ಗುರುತಿಸಲಾದ ಕುಟುಂಬಗಳು. ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ.',
    department: 'Ministry of Health and Family Welfare',
    level: 'CENTRAL',
    category: 'healthcare',
    source: 'myscheme',
    applicationUrl: 'https://pmjay.gov.in/',
    officialUrl: 'https://pmjay.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Ration card', 'SECC / eligibility details', 'Mobile number'],
    applicationProcessEn: 'Check your family eligibility on the official PM-JAY portal or at a nearby CSC, then visit an empanelled hospital.',
    applicationProcessKn: 'ಅಧಿಕೃತ ಪಿಎಂ-ಜಯ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅಥವಾ ಹತ್ತಿರದ ಸಿಎಸ್‌ಸಿಯಲ್ಲಿ ಕುಟುಂಬದ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ, ನಂತರ ಪಟ್ಟಿ ಮಾಡಿದ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'annualIncome', operator: 'LTE', value: 300000, descriptionEn: 'Indicative income screen (official SECC criteria apply)', descriptionKn: 'ಸೂಚಕ ಆದಾಯ ಮಿತಿ (ಅಧಿಕೃತ ಎಸ್‌ಇಸಿಸಿ ಮಾನದಂಡ ಅನ್ವಯಿಸುತ್ತದೆ)' },
    ],
  },
  {
    slug: 'pmay-gramin',
    titleEn: 'Pradhan Mantri Awaas Yojana - Gramin (PMAY-G)',
    titleKn: 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಆವಾಸ್ ಯೋಜನೆ - ಗ್ರಾಮೀಣ (ಪಿಎಂಎವೈ-ಜಿ)',
    summaryEn: 'Financial assistance to eligible rural households for constructing a pucca house.',
    summaryKn: 'ಅರ್ಹ ಗ್ರಾಮೀಣ ಕುಟುಂಬಗಳಿಗೆ ಪಕ್ಕಾ ಮನೆ ನಿರ್ಮಾಣಕ್ಕೆ ಆರ್ಥಿಕ ಸಹಾಯ.',
    benefitsEn:
      'Assistance for house construction paid in instalments, with additional support for toilet, electricity and LPG connections as notified.',
    benefitsKn: 'ಮನೆ ನಿರ್ಮಾಣಕ್ಕೆ ಕಂತುಗಳಲ್ಲಿ ಆರ್ಥಿಕ ಸಹಾಯ, ಜೊತೆಗೆ ಶೌಚಾಲಯ, ವಿದ್ಯುತ್ ಮತ್ತು ಎಲ್‌ಪಿಜಿ ಸಂಪರ್ಕಕ್ಕೆ ಹೆಚ್ಚುವರಿ ಬೆಂಬಲ.',
    eligibilityEn:
      'Houseless families or those living in kutcha or dilapidated houses, identified through SECC and verified by the Gram Panchayat.',
    eligibilityKn:
      'ವಸತಿ ಇಲ್ಲದ ಅಥವಾ ಮಣ್ಣಿನ/ಶಿಥಿಲ ಮನೆಯಲ್ಲಿ ವಾಸಿಸುವ ಕುಟುಂಬಗಳು, ಎಸ್‌ಇಸಿಸಿ ಮೂಲಕ ಗುರುತಿಸಿ ಗ್ರಾಮ ಪಂಚಾಯತ್ ಪರಿಶೀಲನೆ ಮಾಡಿರಬೇಕು.',
    department: 'Ministry of Rural Development',
    level: 'CENTRAL',
    category: 'housing',
    source: 'myscheme',
    applicationUrl: 'https://pmayg.nic.in/',
    officialUrl: 'https://pmayg.nic.in/',
    requiredDocuments: ['Aadhaar card', 'Job card / MGNREGA registration', 'Bank account details', 'Land documents', 'SECC details'],
    applicationProcessEn: 'Contact the Gram Panchayat for SECC verification and registration on the official PMAY-G portal.',
    applicationProcessKn: 'ಎಸ್‌ಇಸಿಸಿ ಪರಿಶೀಲನೆ ಮತ್ತು ಅಧಿಕೃತ ಪಿಎಂಎವೈ-ಜಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನೋಂದಣಿಗಾಗಿ ಗ್ರಾಮ ಪಂಚಾಯತ್ ಸಂಪರ್ಕಿಸಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'annualIncome', operator: 'LTE', value: 300000, descriptionEn: 'Indicative income screen (SECC criteria apply)', descriptionKn: 'ಸೂಚಕ ಆದಾಯ ಮಿತಿ (ಎಸ್‌ಇಸಿಸಿ ಮಾನದಂಡ ಅನ್ವಯಿಸುತ್ತದೆ)' },
    ],
  },
  {
    slug: 'mgnrega',
    titleEn: 'Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)',
    titleKn: 'ಮಹಾತ್ಮ ಗಾಂಧಿ ರಾಷ್ಟ್ರೀಯ ಗ್ರಾಮೀಣ ಉದ್ಯೋಗ ಖಾತರಿ ಯೋಜನೆ (ಮನರೇಗಾ)',
    summaryEn: 'Guarantee of up to 100 days of unskilled wage employment per rural household per year.',
    summaryKn: 'ಪ್ರತಿ ಗ್ರಾಮೀಣ ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ 100 ದಿನಗಳವರೆಗೆ ಕೌಶಲ್ಯರಹಿತ ಕೂಲಿ ಉದ್ಯೋಗದ ಖಾತರಿ.',
    benefitsEn: 'At least 100 days of guaranteed wage employment per household per year, with wages as notified.',
    benefitsKn: 'ಪ್ರತಿ ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ ಕನಿಷ್ಠ 100 ದಿನಗಳ ಖಾತರಿ ಕೂಲಿ ಉದ್ಯೋಗ, ಅಧಿಸೂಚಿತ ದರದಂತೆ ವೇತನ.',
    eligibilityEn: 'Adult members of rural households willing to do unskilled manual work. Apply for a job card at the Gram Panchayat.',
    eligibilityKn: 'ಕೌಶಲ್ಯರಹಿತ ಕೈಯಿಂದ ಮಾಡುವ ಕೆಲಸ ಮಾಡಲು ಸಿದ್ಧರಿರುವ ಗ್ರಾಮೀಣ ಕುಟುಂಬಗಳ ವಯಸ್ಕ ಸದಸ್ಯರು. ಗ್ರಾಮ ಪಂಚಾಯತ್‌ನಲ್ಲಿ ಜಾಬ್ ಕಾರ್ಡ್‌ಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.',
    department: 'Ministry of Rural Development',
    level: 'CENTRAL',
    category: 'employment',
    source: 'myscheme',
    applicationUrl: 'https://nrega.nic.in/',
    officialUrl: 'https://nrega.nic.in/',
    requiredDocuments: ['Aadhaar card', 'Job card', 'Bank account details', 'Photograph'],
    applicationProcessEn: 'Apply for a job card at your Gram Panchayat, then request work. Work must be provided within the time limit notified by law.',
    applicationProcessKn: 'ನಿಮ್ಮ ಗ್ರಾಮ ಪಂಚಾಯತ್‌ನಲ್ಲಿ ಜಾಬ್ ಕಾರ್ಡ್‌ಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ, ನಂತರ ಕೆಲಸಕ್ಕೆ ಅರ್ಜಿ ಹಾಕಿ. ಕಾನೂನಿನಲ್ಲಿ ನಿಗದಿಪಡಿಸಿದ ಸಮಯದೊಳಗೆ ಕೆಲಸ ಒದಗಿಸಬೇಕು.',
    status: 'PUBLISHED',
    rules: [
      { field: 'age', operator: 'GTE', value: 18, descriptionEn: 'Applicant is 18 years or older', descriptionKn: 'ಅರ್ಜಿದಾರರಿಗೆ 18 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು ವಯಸ್ಸು' },
    ],
  },
  {
    slug: 'pm-vishwakarma',
    titleEn: 'PM Vishwakarma',
    titleKn: 'ಪ್ರಧಾನ ಮಂತ್ರಿ ವಿಶ್ವಕರ್ಮ',
    summaryEn: 'Support for traditional artisans and craftspeople through skill training, toolkit grants and credit.',
    summaryKn: 'ಸಾಂಪ್ರದಾಯಿಕ ಕುಶಲಕರ್ಮಿಗಳಿಗೆ ಕೌಶಲ್ಯ ತರಬೇತಿ, ಉಪಕರಣ ಅನುದಾನ ಮತ್ತು ಸಾಲದ ಮೂಲಕ ಬೆಂಬಲ.',
    benefitsEn:
      'Skill upgradation, toolkit incentive, collateral-free credit support and digital/marketing assistance as per scheme guidelines.',
    benefitsKn: 'ಯೋಜನೆಯ ಮಾರ್ಗಸೂಚಿಗಳಂತೆ ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ, ಉಪಕರಣ ಪ್ರೋತ್ಸಾಹ, ಜಾಮೀನು ರಹಿತ ಸಾಲ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಬೆಂಬಲ.',
    eligibilityEn: 'Artisans and craftspeople in notified trades aged 18 years or above, verified through the official portal.',
    eligibilityKn: 'ಅಧಿಸೂಚಿತ ವೃತ್ತಿಗಳಲ್ಲಿ 18 ವರ್ಷ ಮೇಲ್ಪಟ್ಟ ಕುಶಲಕರ್ಮಿಗಳು, ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಮೂಲಕ ಪರಿಶೀಲನೆ.',
    department: 'Ministry of Micro, Small and Medium Enterprises',
    level: 'CENTRAL',
    category: 'small-business',
    source: 'myscheme',
    applicationUrl: 'https://pmvishwakarma.gov.in/',
    officialUrl: 'https://pmvishwakarma.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Bank account details', 'Proof of trade / work', 'Mobile number'],
    applicationProcessEn: 'Register at the nearest CSC or on the official portal, complete verification, then apply for the applicable benefits.',
    applicationProcessKn: 'ಹತ್ತಿರದ ಸಿಎಸ್‌ಸಿ ಅಥವಾ ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನೋಂದಣಿ ಮಾಡಿ, ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಳಿಸಿ, ನಂತರ ಅನ್ವಯವಾಗುವ ಪ್ರಯೋಜನಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'age', operator: 'GTE', value: 18, descriptionEn: 'Applicant is 18 years or older', descriptionKn: 'ಅರ್ಜಿದಾರರಿಗೆ 18 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು ವಯಸ್ಸು' },
      { field: 'occupation', operator: 'IN', value: ['ARTISAN', 'CRAFTSPERSON'], descriptionEn: 'Works in a notified artisan trade', descriptionKn: 'ಅಧಿಸೂಚಿತ ಕುಶಲಕರ್ಮಿ ವೃತ್ತಿಯಲ್ಲಿ ಕೆಲಸ' },
    ],
  },
  {
    slug: 'national-scholarship-portal',
    titleEn: 'National Scholarship Portal',
    titleKn: 'ರಾಷ್ಟ್ರೀಯ ವಿದ್ಯಾರ್ಥಿವೇತನ ಪೋರ್ಟಲ್',
    summaryEn: 'Single window for central and state scholarship applications for school, college and professional courses.',
    summaryKn: 'ಶಾಲೆ, ಕಾಲೇಜು ಮತ್ತು ವೃತ್ತಿಪರ ಕೋರ್ಸ್‌ಗಳಿಗೆ ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಜಿಗಳಿಗೆ ಏಕೀಕೃತ ವೇದಿಕೆ.',
    benefitsEn: 'Access to multiple central and state scholarships through a single application process. Amounts vary by scholarship.',
    benefitsKn: 'ಒಂದೇ ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆಯ ಮೂಲಕ ಹಲವು ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳಿಗೆ ಅವಕಾಶ. ಮೊತ್ತವು ಯೋಜನೆಗೆ ಅನುಗುಣವಾಗಿ ಬದಲಾಗುತ್ತದೆ.',
    eligibilityEn: "Students enrolled in recognised institutions who meet the specific scholarship's income, category and academic criteria.",
    eligibilityKn: 'ಮಾನ್ಯತೆ ಪಡೆದ ಸಂಸ್ಥೆಗಳಲ್ಲಿ ವ್ಯಾಸಂಗ ಮಾಡುತ್ತಿರುವ, ಆಯಾ ವಿದ್ಯಾರ್ಥಿವೇತನದ ಆದಾಯ, ವರ್ಗ ಮತ್ತು ಶೈಕ್ಷಣಿಕ ಮಾನದಂಡ ಪೂರೈಸುವ ವಿದ್ಯಾರ್ಥಿಗಳು.',
    department: 'Ministry of Education',
    level: 'CENTRAL',
    category: 'education',
    source: 'myscheme',
    applicationUrl: 'https://scholarships.gov.in/',
    officialUrl: 'https://scholarships.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Income certificate', 'Caste certificate (where applicable)', 'Marks cards', 'Bank account details', 'Institute verification'],
    applicationProcessEn: 'Register on the National Scholarship Portal, complete the application and get it verified by your institution.',
    applicationProcessKn: 'ರಾಷ್ಟ್ರೀಯ ವಿದ್ಯಾರ್ಥಿವೇತನ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನೋಂದಣಿ ಮಾಡಿ, ಅರ್ಜಿ ಪೂರ್ಣಗೊಳಿಸಿ ಮತ್ತು ನಿಮ್ಮ ಸಂಸ್ಥೆಯಿಂದ ಪರಿಶೀಲನೆ ಪಡೆಯಿರಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'age', operator: 'GTE', value: 16, descriptionEn: 'Applicant is 16 years or older', descriptionKn: 'ಅರ್ಜಿದಾರರಿಗೆ 16 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು ವಯಸ್ಸು' },
    ],
  },
  {
    slug: 'gruha-lakshmi',
    titleEn: 'Gruha Lakshmi Scheme (Karnataka)',
    titleKn: 'ಗೃಹ ಲಕ್ಷ್ಮಿ ಯೋಜನೆ (ಕರ್ನಾಟಕ)',
    summaryEn: 'Monthly financial assistance to the woman head of an eligible household in Karnataka, as notified by the state government.',
    summaryKn: 'ಅರ್ಹ ಕುಟುಂಬದ ಮಹಿಳಾ ಮುಖ್ಯಸ್ಥರಿಗೆ ರಾಜ್ಯ ಸರ್ಕಾರದ ಅಧಿಸೂಚನೆಯಂತೆ ಮಾಸಿಕ ಆರ್ಥಿಕ ಸಹಾಯ.',
    benefitsEn: 'Monthly financial assistance credited to the bank account of the eligible woman head of household. Confirm the current amount in the official notification.',
    benefitsKn: 'ಅರ್ಹ ಮಹಿಳಾ ಕುಟುಂಬ ಮುಖ್ಯಸ್ಥರ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಮಾಸಿಕ ಆರ್ಥಿಕ ಸಹಾಯ. ಪ್ರಸ್ತುತ ಮೊತ್ತವನ್ನು ಅಧಿಕೃತ ಅಧಿಸೂಚನೆಯಲ್ಲಿ ದೃಢೀಕರಿಸಿ.',
    eligibilityEn: 'Woman head of household with a valid ration card and other conditions as notified. Confirm current rules on Seva Sindhu.',
    eligibilityKn: 'ಮಾನ್ಯ ರೇಷನ್ ಕಾರ್ಡ್ ಹೊಂದಿರುವ ಮಹಿಳಾ ಕುಟುಂಬ ಮುಖ್ಯಸ್ಥರು ಮತ್ತು ಅಧಿಸೂಚಿತ ಇತರ ಷರತ್ತುಗಳು. ಪ್ರಸ್ತುತ ನಿಯಮಗಳನ್ನು ಸೇವಾ ಸಿಂಧುವಿನಲ್ಲಿ ದೃಢೀಕರಿಸಿ.',
    department: 'Department of Women and Child Development, Government of Karnataka',
    level: 'STATE',
    category: 'women-empowerment',
    source: 'seva-sindhu',
    applicationUrl: 'https://sevasindhuservices.karnataka.gov.in/',
    officialUrl: 'https://sevasindhu.karnataka.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Ration card', 'Bank account details', 'Address proof'],
    applicationProcessEn: 'Apply through Seva Sindhu or at a Bapuji Seva Kendra / CSC. Keep your ration card and bank details ready.',
    applicationProcessKn: 'ಸೇವಾ ಸಿಂಧು ಅಥವಾ ಬಾಪೂಜಿ ಸೇವಾ ಕೇಂದ್ರ / ಸಿಎಸ್‌ಸಿ ಮೂಲಕ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ. ರೇಷನ್ ಕಾರ್ಡ್ ಮತ್ತು ಬ್ಯಾಂಕ್ ವಿವರಗಳನ್ನು ಸಿದ್ಧವಾಗಿಡಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'gender', operator: 'EQ', value: 'FEMALE', descriptionEn: 'Applicant is a woman head of household', descriptionKn: 'ಅರ್ಜಿದಾರರು ಮಹಿಳಾ ಕುಟುಂಬ ಮುಖ್ಯಸ್ಥರು' },
      { field: 'state', operator: 'EQ', value: 'Karnataka', descriptionEn: 'Resident of Karnataka', descriptionKn: 'ಕರ್ನಾಟಕದ ನಿವಾಸಿ' },
    ],
  },
  {
    slug: 'gruha-jyothi',
    titleEn: 'Gruha Jyothi Scheme (Karnataka)',
    titleKn: 'ಗೃಹ ಜ್ಯೋತಿ ಯೋಜನೆ (ಕರ್ನಾಟಕ)',
    summaryEn: 'Free electricity up to the notified monthly unit limit for eligible residential households in Karnataka.',
    summaryKn: 'ಕರ್ನಾಟಕದ ಅರ್ಹ ವಸತಿ ಗೃಹಗಳಿಗೆ ಅಧಿಸೂಚಿತ ಮಾಸಿಕ ಘಟಕಗಳವರೆಗೆ ಉಚಿತ ವಿದ್ಯುತ್.',
    benefitsEn: 'Zero electricity charges up to the notified monthly consumption limit; units above the limit are billed as per tariff.',
    benefitsKn: 'ಅಧಿಸೂಚಿತ ಮಾಸಿಕ ಬಳಕೆಯ ಮಿತಿಯವರೆಗೆ ವಿದ್ಯುತ್ ಶುಲ್ಕ ಶೂನ್ಯ; ಮಿತಿ ಮೀರಿದ ಘಟಕಗಳಿಗೆ ಸಾಮಾನ್ಯ ದರ ಅನ್ವಯ.',
    eligibilityEn: 'Residential households in Karnataka that meet the notified criteria; one connection per household as applicable.',
    eligibilityKn: 'ಅಧಿಸೂಚಿತ ಮಾನದಂಡ ಪೂರೈಸುವ ಕರ್ನಾಟಕದ ವಸತಿ ಗೃಹಗಳು; ಅನ್ವಯವಾದಂತೆ ಪ್ರತಿ ಮನೆಗೆ ಒಂದು ಸಂಪರ್ಕ.',
    department: 'Karnataka Power Department / ESCOMs',
    level: 'STATE',
    category: 'financial-assistance',
    source: 'seva-sindhu',
    applicationUrl: 'https://sevasindhuservices.karnataka.gov.in/',
    officialUrl: 'https://sevasindhu.karnataka.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Electricity bill / account number', 'Ration card'],
    applicationProcessEn: 'Apply through Seva Sindhu or your electricity supply company (ESCOM) office as notified.',
    applicationProcessKn: 'ಸೇವಾ ಸಿಂಧು ಅಥವಾ ನಿಮ್ಮ ವಿದ್ಯುತ್ ಸರಬರಾಜು ಕಂಪನಿ (ಇಎಸ್‌ಕಾಮ್) ಕಚೇರಿ ಮೂಲಕ ಅಧಿಸೂಚಿತ ರೀತಿಯಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'state', operator: 'EQ', value: 'Karnataka', descriptionEn: 'Resident of Karnataka', descriptionKn: 'ಕರ್ನಾಟಕದ ನಿವಾಸಿ' },
    ],
  },
  {
    slug: 'yuva-nidhi',
    titleEn: 'Yuva Nidhi Scheme (Karnataka)',
    titleKn: 'ಯುವ ನಿಧಿ ಯೋಜನೆ (ಕರ್ನಾಟಕ)',
    summaryEn: 'Unemployment allowance for eligible educated youth in Karnataka for a limited period, as notified.',
    summaryKn: 'ಕರ್ನಾಟಕದ ಅರ್ಹ ವಿದ್ಯಾವಂತ ಯುವಕರಿಗೆ ಅಧಿಸೂಚಿತ ಅವಧಿಗೆ ನಿರುದ್ಯೋಗ ಭತ್ಯೆ.',
    benefitsEn: 'Monthly allowance for degree and diploma holders for the period notified by the state government.',
    benefitsKn: 'ರಾಜ್ಯ ಸರ್ಕಾರ ಅಧಿಸೂಚಿಸಿದ ಅವಧಿಗೆ ಪದವಿ ಮತ್ತು ಡಿಪ್ಲೊಮಾ ಪಡೆದವರಿಗೆ ಮಾಸಿಕ ಭತ್ಯೆ.',
    eligibilityEn: 'Karnataka residents who passed degree or diploma in the notified academic year, are unemployed and meet age and other conditions.',
    eligibilityKn: 'ಅಧಿಸೂಚಿತ ಶೈಕ್ಷಣಿಕ ವರ್ಷದಲ್ಲಿ ಪದವಿ ಅಥವಾ ಡಿಪ್ಲೊಮಾ ಪಡೆದ, ನಿರುದ್ಯೋಗಿಯಾಗಿರುವ, ವಯಸ್ಸು ಮತ್ತು ಇತರ ಷರತ್ತು ಪೂರೈಸುವ ಕರ್ನಾಟಕ ನಿವಾಸಿಗಳು.',
    department: 'Department of Skill Development, Entrepreneurship and Livelihood, Government of Karnataka',
    level: 'STATE',
    category: 'youth-entrepreneurship',
    source: 'seva-sindhu',
    applicationUrl: 'https://sevasindhuservices.karnataka.gov.in/',
    officialUrl: 'https://sevasindhu.karnataka.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Degree / diploma certificate', 'Marks cards', 'Bank account details', 'Domicile proof'],
    applicationProcessEn: 'Apply through Seva Sindhu. Keep your degree/diploma certificates and bank details ready.',
    applicationProcessKn: 'ಸೇವಾ ಸಿಂಧು ಮೂಲಕ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ. ಪದವಿ/ಡಿಪ್ಲೊಮಾ ಪ್ರಮಾಣಪತ್ರ ಮತ್ತು ಬ್ಯಾಂಕ್ ವಿವರಗಳನ್ನು ಸಿದ್ಧವಾಗಿಡಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'age', operator: 'GTE', value: 18, descriptionEn: 'Applicant is 18 years or older', descriptionKn: 'ಅರ್ಜಿದಾರರಿಗೆ 18 ವರ್ಷ ಅಥವಾ ಹೆಚ್ಚು ವಯಸ್ಸು' },
      { field: 'age', operator: 'LTE', value: 35, descriptionEn: 'Applicant is 35 years or younger', descriptionKn: 'ಅರ್ಜಿದಾರರಿಗೆ 35 ವರ್ಷ ಅಥವಾ ಕಡಿಮೆ ವಯಸ್ಸು' },
      { field: 'education', operator: 'IN', value: ['DEGREE', 'DIPLOMA'], descriptionEn: 'Degree or diploma holder', descriptionKn: 'ಪದವಿ ಅಥವಾ ಡಿಪ್ಲೊಮಾ ಪಡೆದಿರಬೇಕು' },
      { field: 'state', operator: 'EQ', value: 'Karnataka', descriptionEn: 'Resident of Karnataka', descriptionKn: 'ಕರ್ನಾಟಕದ ನಿವಾಸಿ' },
    ],
  },
  {
    slug: 'shakti-scheme',
    titleEn: 'Shakti Scheme (Karnataka)',
    titleKn: 'ಶಕ್ತಿ ಯೋಜನೆ (ಕರ್ನಾಟಕ)',
    summaryEn: 'Free travel for women on ordinary state-run buses within Karnataka, as notified.',
    summaryKn: 'ಕರ್ನಾಟಕದೊಳಗೆ ಸಾಮಾನ್ಯ ಸರ್ಕಾರಿ ಬಸ್‌ಗಳಲ್ಲಿ ಮಹಿಳೆಯರಿಗೆ ಉಚಿತ ಪ್ರಯಾಣ, ಅಧಿಸೂಚನೆಯಂತೆ.',
    benefitsEn: 'Free bus travel for eligible women on specified state-owned bus services.',
    benefitsKn: 'ನಿಗದಿತ ಸರ್ಕಾರಿ ಬಸ್ ಸೇವೆಗಳಲ್ಲಿ ಅರ್ಹ ಮಹಿಳೆಯರಿಗೆ ಉಚಿತ ಪ್ರಯಾಣ.',
    eligibilityEn: 'Women residing in Karnataka, subject to the notified conditions and valid identity proof.',
    eligibilityKn: 'ಕರ್ನಾಟಕದಲ್ಲಿ ವಾಸಿಸುವ ಮಹಿಳೆಯರು, ಅಧಿಸೂಚಿತ ಷರತ್ತುಗಳು ಮತ್ತು ಮಾನ್ಯ ಗುರುತಿನ ಚೀಟಿಗೆ ಒಳಪಟ್ಟು.',
    department: 'Karnataka State Road Transport Corporations / Government of Karnataka',
    level: 'STATE',
    category: 'women-empowerment',
    source: 'seva-sindhu',
    applicationUrl: 'https://sevasindhu.karnataka.gov.in/',
    officialUrl: 'https://sevasindhu.karnataka.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Address / domicile proof', 'Photograph'],
    applicationProcessEn: 'Carry valid identity proof while travelling. Check the official transport corporation notice for current rules.',
    applicationProcessKn: 'ಪ್ರಯಾಣ ಮಾಡುವಾಗ ಮಾನ್ಯ ಗುರುತಿನ ಚೀಟಿ ಜೊತೆಗೆ ಇಟ್ಟುಕೊಳ್ಳಿ. ಪ್ರಸ್ತುತ ನಿಯಮಗಳಿಗೆ ಅಧಿಕೃತ ಸಾರಿಗೆ ನಿಗಮದ ಸೂಚನೆ ನೋಡಿ.',
    status: 'PUBLISHED',
    rules: [
      { field: 'gender', operator: 'EQ', value: 'FEMALE', descriptionEn: 'Applicant is a woman', descriptionKn: 'ಅರ್ಜಿದಾರರು ಮಹಿಳೆ' },
      { field: 'state', operator: 'EQ', value: 'Karnataka', descriptionEn: 'Resident of Karnataka', descriptionKn: 'ಕರ್ನಾಟಕದ ನಿವಾಸಿ' },
    ],
  },
  {
    slug: 'raitha-siri',
    titleEn: 'Raitha Siri (Karnataka)',
    titleKn: 'ರೈತ ಸಿರಿ (ಕರ್ನಾಟಕ)',
    summaryEn:
      'A Karnataka farmer support programme. Benefits, crops covered and eligibility are set by government order and must be confirmed on the official portal.',
    summaryKn:
      'ಕರ್ನಾಟಕದ ರೈತ ಬೆಂಬಲ ಕಾರ್ಯಕ್ರಮ. ಪ್ರಯೋಜನಗಳು, ಒಳಗೊಂಡ ಬೆಳೆಗಳು ಮತ್ತು ಅರ್ಹತೆ ಸರ್ಕಾರದ ಆದೇಶದಂತೆ ನಿಗದಿಯಾಗಿದ್ದು, ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ದೃಢೀಕರಿಸಬೇಕು.',
    benefitsEn: 'As per the current government order. Confirm the benefit amount and coverage on the official portal before applying.',
    benefitsKn: 'ಪ್ರಸ್ತುತ ಸರ್ಕಾರದ ಆದೇಶದಂತೆ. ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಪ್ರಯೋಜನದ ಮೊತ್ತ ಮತ್ತು ವ್ಯಾಪ್ತಿಯನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ದೃಢೀಕರಿಸಿ.',
    eligibilityEn: 'Eligibility is defined by the latest government order. Verify on the official portal; do not rely on third-party summaries.',
    eligibilityKn: 'ಅರ್ಹತೆಯನ್ನು ಇತ್ತೀಚಿನ ಸರ್ಕಾರದ ಆದೇಶ ನಿರ್ಧರಿಸುತ್ತದೆ. ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ; ತೃತೀಯ ಮಾಹಿತಿ ಮೇಲೆ ಅವಲಂಬಿತರಾಗಬೇಡಿ.',
    department: 'Department of Agriculture, Government of Karnataka',
    level: 'STATE',
    category: 'agriculture',
    source: 'raitamitra',
    applicationUrl: 'https://raitamitra.karnataka.gov.in/',
    officialUrl: 'https://raitamitra.karnataka.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Land records (RTC / Pahani)', 'Bank account details'],
    applicationProcessEn: 'Check the official Raitha Mitra portal or visit the nearest agriculture office for the current process.',
    applicationProcessKn: 'ಪ್ರಸ್ತುತ ಪ್ರಕ್ರಿಯೆಗಾಗಿ ಅಧಿಕೃತ ರೈತ ಮಿತ್ರ ಪೋರ್ಟಲ್ ನೋಡಿ ಅಥವಾ ಹತ್ತಿರದ ಕೃಷಿ ಕಚೇರಿಗೆ ಭೇಟಿ ನೀಡಿ.',
    status: 'PENDING_VERIFICATION',
    rules: [
      { field: 'occupation', operator: 'EQ', value: 'FARMER', descriptionEn: 'Applicant is a farmer', descriptionKn: 'ಅರ್ಜಿದಾರರು ರೈತರಾಗಿರಬೇಕು' },
    ],
  },
  {
    slug: 'karnataka-post-matric-scholarship',
    titleEn: 'Karnataka Post-Matric Scholarship (SC/ST)',
    titleKn: 'ಕರ್ನಾಟಕ ಪೋಸ್ಟ್ ಮೆಟ್ರಿಕ್ ವಿದ್ಯಾರ್ಥಿವೇತನ (ಎಸ್‌ಸಿ/ಎಸ್‌ಟಿ)',
    summaryEn: 'Scholarship support for SC/ST students in Karnataka pursuing post-matriculation courses, as per state rules.',
    summaryKn: 'ಕರ್ನಾಟಕದ ಎಸ್‌ಸಿ/ಎಸ್‌ಟಿ ವಿದ್ಯಾರ್ಥಿಗಳು ಮೆಟ್ರಿಕ್ ನಂತರದ ಕೋರ್ಸ್‌ಗಳಲ್ಲಿ ವ್ಯಾಸಂಗ ಮಾಡಲು ರಾಜ್ಯ ನಿಯಮಗಳಂತೆ ವಿದ್ಯಾರ್ಥಿವೇತನ.',
    benefitsEn: 'Scholarship and fee reimbursement as per the current state rules. Confirm amounts and deadlines on the official portal.',
    benefitsKn: 'ಪ್ರಸ್ತುತ ರಾಜ್ಯ ನಿಯಮಗಳಂತೆ ವಿದ್ಯಾರ್ಥಿವೇತನ ಮತ್ತು ಶುಲ್ಕ ಮರುಪಾವತಿ. ಮೊತ್ತ ಮತ್ತು ಕೊನೆಯ ದಿನಾಂಕವನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ದೃಢೀಕರಿಸಿ.',
    eligibilityEn: 'SC/ST students of Karnataka enrolled in recognised post-matriculation courses, subject to income and other notified conditions.',
    eligibilityKn: 'ಮಾನ್ಯತೆ ಪಡೆದ ಮೆಟ್ರಿಕ್ ನಂತರದ ಕೋರ್ಸ್‌ಗಳಲ್ಲಿ ವ್ಯಾಸಂಗ ಮಾಡುತ್ತಿರುವ ಕರ್ನಾಟಕದ ಎಸ್‌ಸಿ/ಎಸ್‌ಟಿ ವಿದ್ಯಾರ್ಥಿಗಳು, ಆದಾಯ ಮತ್ತು ಇತರ ಅಧಿಸೂಚಿತ ಷರತ್ತುಗಳಿಗೆ ಒಳಪಟ್ಟು.',
    department: 'Department of Social Welfare, Government of Karnataka',
    level: 'STATE',
    category: 'education',
    source: 'seva-sindhu',
    applicationUrl: 'https://scholarships.karnataka.gov.in/',
    officialUrl: 'https://sevasindhu.karnataka.gov.in/',
    requiredDocuments: ['Aadhaar card', 'Caste certificate', 'Income certificate', 'Marks cards', 'Bank account details', 'Institute verification'],
    applicationProcessEn: 'Apply through the Karnataka scholarship portal or Seva Sindhu, then complete institute verification.',
    applicationProcessKn: 'ಕರ್ನಾಟಕ ವಿದ್ಯಾರ್ಥಿವೇತನ ಪೋರ್ಟಲ್ ಅಥವಾ ಸೇವಾ ಸಿಂಧು ಮೂಲಕ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ, ನಂತರ ಸಂಸ್ಥೆಯ ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಳಿಸಿ.',
    status: 'PENDING_VERIFICATION',
    rules: [
      { field: 'socialCategory', operator: 'IN', value: ['SC', 'ST'], descriptionEn: 'Applicant belongs to SC or ST category', descriptionKn: 'ಅರ್ಜಿದಾರರು ಎಸ್‌ಸಿ ಅಥವಾ ಎಸ್‌ಟಿ ವರ್ಗಕ್ಕೆ ಸೇರಿದವರು' },
    ],
  },
];

async function seedCategories() {
  for (const [index, category] of categories.entries()) {
    await prisma.schemeCategory.upsert({
      where: { slug: category.slug },
      create: { ...category, sortOrder: index, isActive: true },
      update: { ...category, sortOrder: index, isActive: true },
    });
  }
  return prisma.schemeCategory.findMany();
}

async function seedSources() {
  for (const source of sources) {
    await prisma.schemeSource.upsert({
      where: { slug: source.slug },
      create: { ...source, isActive: true },
      update: { ...source, isActive: true },
    });
  }
  return prisma.schemeSource.findMany();
}

async function seedUsers() {
  const accounts = [
    {
      email: 'superadmin@gramasahay.local',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe!123',
    },
    {
      email: 'admin@gramasahay.local',
      fullName: 'District Admin',
      role: 'ADMIN',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!123',
    },
    {
      email: 'verifier@gramasahay.local',
      fullName: 'Scheme Verifier',
      role: 'SCHEME_VERIFIER',
      password: process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe!123',
    },
    {
      email: 'facilitator@gramasahay.local',
      fullName: 'Village Facilitator',
      role: 'VILLAGE_FACILITATOR',
      password: process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe!123',
    },
    {
      email: 'citizen@gramasahay.local',
      fullName: 'Lakshmi Devi',
      role: 'CITIZEN',
      password: process.env.SEED_CITIZEN_PASSWORD ?? 'ChangeMe!123',
    },
  ];

  const users = [];
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, BCRYPT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: account.email },
      create: {
        email: account.email,
        fullName: account.fullName,
        role: account.role,
        passwordHash,
        preferredLanguage: account.role === 'CITIZEN' ? 'kn' : 'en',
      },
      update: {
        fullName: account.fullName,
        role: account.role,
        isActive: true,
      },
    });

    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
    await prisma.userConsent.upsert({
      where: { userId_consentType: { userId: user.id, consentType: 'DATA_PROCESSING' } },
      create: {
        userId: user.id,
        consentType: 'DATA_PROCESSING',
        granted: true,
        version: '1.0',
        grantedAt: new Date(),
      },
      update: {},
    });

    users.push(user);
  }

  for (const user of users) {
    await prisma.citizenProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, state: 'Karnataka' },
      update: {},
    });
  }

  const citizen = users.find((user) => user.email === 'citizen@gramasahay.local');
  if (citizen) {
    await prisma.citizenProfile.upsert({
      where: { userId: citizen.id },
      create: {
        userId: citizen.id,
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        taluk: 'Bengaluru South',
        village: 'Kaggalipura',
        gramPanchayat: 'Kaggalipura Gram Panchayat',
        gender: 'FEMALE',
        occupation: 'FARMER',
        annualIncome: 120000,
        education: 'DEGREE',
        landHoldingAcres: 1.5,
        familySize: 4,
        socialCategory: 'OBC',
        disabilityStatus: false,
        onboardingCompleted: true,
      },
      update: {
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        taluk: 'Bengaluru South',
        village: 'Kaggalipura',
        gender: 'FEMALE',
        occupation: 'FARMER',
        annualIncome: 120000,
        education: 'DEGREE',
        landHoldingAcres: 1.5,
        familySize: 4,
        socialCategory: 'OBC',
        onboardingCompleted: true,
      },
    });
  }

  return users;
}

async function seedSchemes(categoriesById: Map<string, string>, sourcesById: Map<string, string>) {
  let created = 0;
  let updated = 0;

  for (const scheme of schemes) {
    const categoryId = categoriesById.get(scheme.category);
    const sourceId = sourcesById.get(scheme.source);
    if (!categoryId) throw new Error(`Unknown category ${scheme.category} for scheme ${scheme.slug}`);

    const now = new Date();
    const data = {
      titleEn: scheme.titleEn,
      titleKn: scheme.titleKn,
      titleHi: scheme.titleHi ?? null,
      summaryEn: scheme.summaryEn,
      summaryKn: scheme.summaryKn,
      descriptionEn: null,
      descriptionKn: null,
      department: scheme.department,
      level: scheme.level,
      state: scheme.level === 'STATE' ? 'Karnataka' : null,
      categoryId,
      benefitsEn: scheme.benefitsEn,
      benefitsKn: scheme.benefitsKn,
      eligibilityEn: scheme.eligibilityEn,
      eligibilityKn: scheme.eligibilityKn,
      requiredDocumentsJson: JSON.stringify(scheme.requiredDocuments),
      applicationProcessEn: scheme.applicationProcessEn,
      applicationProcessKn: scheme.applicationProcessKn,
      applicationUrl: scheme.applicationUrl,
      officialUrl: scheme.officialUrl,
      sourceId: sourceId ?? null,
      status: scheme.status,
      isDemoData: true,
      lastVerifiedAt: scheme.status === 'PUBLISHED' ? now : null,
      publishedAt: scheme.status === 'PUBLISHED' ? now : null,
    };

    const existing = await prisma.scheme.findUnique({ where: { slug: scheme.slug } });

    const record = existing
      ? await prisma.scheme.update({ where: { slug: scheme.slug }, data })
      : await prisma.scheme.create({ data: { ...data, slug: scheme.slug, version: 1 } });

    if (existing) updated += 1;
    else created += 1;

    await prisma.eligibilityRule.deleteMany({ where: { schemeId: record.id } });
    if (scheme.rules.length > 0) {
      await prisma.eligibilityRule.createMany({
        data: scheme.rules.map((rule, index) => ({
          schemeId: record.id,
          field: rule.field,
          operator: rule.operator,
          valueJson: JSON.stringify(rule.value),
          descriptionEn: rule.descriptionEn,
          descriptionKn: rule.descriptionKn,
          isRequired: true,
          sortOrder: index,
        })),
      });
    }

    await prisma.schemeTranslation.deleteMany({ where: { schemeId: record.id } });
    await prisma.schemeTranslation.create({
      data: {
        schemeId: record.id,
        language: 'kn',
        fieldsJson: JSON.stringify({
          title: scheme.titleKn,
          summary: scheme.summaryKn,
          benefits: scheme.benefitsKn,
          eligibility: scheme.eligibilityKn,
          applicationProcess: scheme.applicationProcessKn,
        }),
        provider: 'AI',
        quality: 'DRAFT',
      },
    });

    const snapshot = {
      titleEn: scheme.titleEn,
      summaryEn: scheme.summaryEn,
      benefitsEn: scheme.benefitsEn,
      eligibilityEn: scheme.eligibilityEn,
      requiredDocuments: scheme.requiredDocuments,
      applicationUrl: scheme.applicationUrl,
      officialUrl: scheme.officialUrl,
      status: scheme.status,
    };
    await prisma.schemeVersion.upsert({
      where: { schemeId_version: { schemeId: record.id, version: 1 } },
      create: {
        schemeId: record.id,
        version: 1,
        snapshotJson: JSON.stringify(snapshot),
        changeSummary: 'Initial seed record (demo data)',
      },
      update: { snapshotJson: JSON.stringify(snapshot) },
    });
  }

  return { created, updated };
}

async function seedOperations() {
  const centres = [
    {
      id: 'seed-centre-bengaluru-south',
      name: 'Demo CSC - Bengaluru South',
      type: 'CSC',
      address: 'Demo record: confirm the actual address with the district administration.',
      district: 'Bengaluru Urban',
      taluk: 'Bengaluru South',
      openingHours: '10:00-17:00 (demo)',
    },
    {
      id: 'seed-centre-mysuru',
      name: 'Demo Gram Panchayat help desk - Mysuru',
      type: 'GRAMA_PANCHAYAT',
      address: 'Demo record: confirm the actual address with the district administration.',
      district: 'Mysuru',
      taluk: 'Mysuru',
      openingHours: '10:00-17:00 (demo)',
    },
    {
      id: 'seed-centre-belagavi',
      name: 'Demo government office - Belagavi',
      type: 'GOVERNMENT_OFFICE',
      address: 'Demo record: confirm the actual address with the district administration.',
      district: 'Belagavi',
      taluk: 'Belagavi',
      openingHours: '10:00-17:00 (demo)',
    },
    {
      id: 'seed-centre-kalaburagi',
      name: 'Demo NGO support desk - Kalaburagi',
      type: 'NGO',
      address: 'Demo record: confirm the actual address with the district administration.',
      district: 'Kalaburagi',
      taluk: 'Kalaburagi',
      openingHours: '10:00-17:00 (demo)',
    },
  ] as const;

  for (const centre of centres) {
    await prisma.assistanceCentre.upsert({
      where: { id: centre.id },
      create: { ...centre, isActive: true },
      update: {},
    });
  }

  const citizen = await prisma.user.findUnique({ where: { email: 'citizen@gramasahay.local' } });
  const pmKisan = await prisma.scheme.findUnique({ where: { slug: 'pm-kisan' } });

  if (citizen && pmKisan) {
    await prisma.applicationRecord.upsert({
      where: { id: 'seed-app-citizen-pm-kisan' },
      create: {
        id: 'seed-app-citizen-pm-kisan',
        userId: citizen.id,
        schemeId: pmKisan.id,
        status: 'DRAFT',
        notes: 'Demo tracking record only. This is not an official application or reference number.',
      },
      update: {},
    });

    await prisma.notification.upsert({
      where: { dedupeKey: 'seed-welcome-citizen' },
      create: {
        userId: citizen.id,
        schemeId: pmKisan.id,
        title: 'GRAMA SAHAY ಗೆ ಸ್ವಾಗತ',
        body: 'ಇದು ಡೆಮೊ ಅಧಿಸೂಚನೆ. ಯೋಜನೆಯ ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಮೂಲದಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.',
        language: 'kn',
        type: 'SYSTEM',
        channel: 'IN_APP',
        status: 'SENT',
        sentAt: new Date(),
        dedupeKey: 'seed-welcome-citizen',
      },
      update: {},
    });
  }

  return centres.length;
}

async function main() {
  console.log('[seed] Starting GRAMA SAHAY seed...');

  const categoryRows = await seedCategories();
  const sourceRows = await seedSources();
  const categoriesById = new Map(categoryRows.map((row) => [row.slug, row.id]));
  const sourcesById = new Map(sourceRows.map((row) => [row.slug, row.id]));

  const users = await seedUsers();
  const schemeResult = await seedSchemes(categoriesById, sourcesById);
  const centreCount = await seedOperations();

  console.log(`[seed] Categories: ${categoryRows.length}`);
  console.log(`[seed] Sources: ${sourceRows.length}`);
  console.log(`[seed] Users: ${users.length} (passwords from SEED_* env vars)`);
  console.log(`[seed] Schemes: ${schemeResult.created} created, ${schemeResult.updated} updated (demo data)`);
  console.log(`[seed] Assistance centres: ${centreCount} demo records`);
  console.log('[seed] Done. Demo scheme data is illustrative only - verify against official sources.');
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
