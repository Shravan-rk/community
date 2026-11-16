import { prisma } from '../db.js';
import type { Language } from './roles.js';

export interface InAppNotificationInput {
  userId: string;
  schemeId?: string | null;
  type: 'SCHEME_UPDATE' | 'NEW_SCHEME' | 'DEADLINE' | 'APPLICATION' | 'SYSTEM';
  language?: Language;
  title: string;
  body: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
}

export async function createInAppNotification(input: InAppNotificationInput) {
  const now = new Date();
  const data = {
    userId: input.userId,
    schemeId: input.schemeId ?? null,
    type: input.type,
    language: input.language ?? 'kn',
    title: input.title,
    body: input.body,
    channel: 'IN_APP',
    status: 'SENT',
    sentAt: now,
    dedupeKey: input.dedupeKey ?? null,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
  };

  if (input.dedupeKey) {
    return prisma.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: data,
      update: {},
    });
  }
  return prisma.notification.create({ data });
}

export function localizedSchemePublished(
  language: string | null | undefined,
  titleEn: string,
  titleKn: string | null,
  titleHi: string | null,
) {
  if (language === 'en') {
    return {
      language: 'en' as const,
      title: `Scheme published: ${titleEn}`,
      body: 'A scheme you saved is now published. Confirm every detail on the official government source before applying.',
    };
  }
  if (language === 'hi') {
    return {
      language: 'hi' as const,
      title: `योजना प्रकाशित: ${titleHi ?? titleEn}`,
      body: 'आपके द्वारा सहेजी गई योजना अब प्रकाशित है। आवेदन से पहले सभी विवरण आधिकारिक सरकारी स्रोत पर जाँचें।',
    };
  }
  return {
    language: 'kn' as const,
    title: `ಯೋಜನೆ ಪ್ರಕಟವಾಗಿದೆ: ${titleKn ?? titleEn}`,
    body: 'ನೀವು ಉಳಿಸಿದ ಯೋಜನೆ ಈಗ ಪ್ರಕಟವಾಗಿದೆ. ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಮೂಲದಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.',
  };
}

export function localizedApplicationUpdate(
  language: string | null | undefined,
  schemeTitleEn: string,
  schemeTitleKn: string | null,
  status: string,
) {
  if (language === 'en') {
    return {
      language: 'en' as const,
      title: `Application update: ${schemeTitleEn}`,
      body: `Your tracked application status is now ${status.replaceAll('_', ' ').toLowerCase()}.`,
    };
  }
  if (language === 'hi') {
    return {
      language: 'hi' as const,
      title: `आवेदन अपडेट: ${schemeTitleEn}`,
      body: `आपके ट्रैक किए गए आवेदन की स्थिति अब ${status.replaceAll('_', ' ').toLowerCase()} है।`,
    };
  }
  return {
    language: 'kn' as const,
    title: `ಅರ್ಜಿ ನವೀಕರಣ: ${schemeTitleKn ?? schemeTitleEn}`,
    body: `ನೀವು ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತಿರುವ ಅರ್ಜಿಯ ಸ್ಥಿತಿ ಈಗ ${status.replaceAll('_', ' ').toLowerCase()} ಆಗಿದೆ.`,
  };
}

export function localizedAssistanceUpdate(language: string | null | undefined, status: string) {
  if (language === 'en') {
    return {
      language: 'en' as const,
      title: 'Assistance request updated',
      body: `Your assistance request status is now ${status.replaceAll('_', ' ').toLowerCase()}.`,
    };
  }
  if (language === 'hi') {
    return {
      language: 'hi' as const,
      title: 'सहायता अनुरोध अपडेट',
      body: 'आपके सहायता अनुरोध की स्थिति बदल गई है। विवरण के लिए अपने अनुरोधों को देखें।',
    };
  }
  return {
    language: 'kn' as const,
    title: 'ಸಹಾಯ ವಿನಂತಿ ನವೀಕರಿಸಲಾಗಿದೆ',
    body: 'ನಿಮ್ಮ ಸಹಾಯ ವಿನಂತಿಯ ಸ್ಥಿತಿ ಬದಲಾಗಿದೆ. ವಿವರಗಳಿಗಾಗಿ ನಿಮ್ಮ ವಿನಂತಿಗಳನ್ನು ನೋಡಿ.',
  };
}
