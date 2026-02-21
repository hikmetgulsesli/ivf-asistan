import type { PrismaClient } from '@prisma/client';

export type {
  Article,
  Faq,
  Video,
  Conversation,
  ResponseCache,
} from '@prisma/client';

export type DeepPrismaClient = PrismaClient;
