-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" SERIAL NOT NULL,
    "question" VARCHAR(1000) NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "embedding" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "url" VARCHAR(2000) NOT NULL,
    "summary" TEXT,
    "keyTopics" JSONB,
    "timestamps" JSONB,
    "category" VARCHAR(100) NOT NULL,
    "durationSeconds" INTEGER,
    "embedding" JSONB,
    "analysisStatus" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "sessionId" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "sentiment" VARCHAR(20),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_cache" (
    "id" SERIAL NOT NULL,
    "queryHash" VARCHAR(64) NOT NULL,
    "queryText" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "sources" JSONB,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "response_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "articles_category_idx" ON "articles"("category");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

-- CreateIndex
CREATE INDEX "faqs_sortOrder_idx" ON "faqs"("sortOrder");

-- CreateIndex
CREATE INDEX "videos_category_idx" ON "videos"("category");

-- CreateIndex
CREATE INDEX "videos_analysisStatus_idx" ON "videos"("analysisStatus");

-- CreateIndex
CREATE INDEX "conversations_sessionId_idx" ON "conversations"("sessionId");

-- CreateIndex
CREATE INDEX "conversations_createdAt_idx" ON "conversations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "response_cache_queryHash_key" ON "response_cache"("queryHash");

-- CreateIndex
CREATE INDEX "response_cache_expiresAt_idx" ON "response_cache"("expiresAt");
