-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "tags" TEXT[],
    "embedding" JSONB,
    "status" VARCHAR(20) DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" SERIAL NOT NULL,
    "question" VARCHAR(1000) NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER DEFAULT 0,
    "embedding" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "url" VARCHAR(2000) NOT NULL,
    "summary" TEXT,
    "key_topics" JSONB,
    "timestamps" JSONB,
    "category" VARCHAR(100) NOT NULL,
    "duration_seconds" INTEGER,
    "embedding" JSONB,
    "analysis_status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "sentiment" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_cache" (
    "id" SERIAL NOT NULL,
    "query_hash" VARCHAR(64) NOT NULL,
    "query_text" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "sources" JSONB,
    "hit_count" INTEGER DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "response_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "response_cache_query_hash_key" ON "response_cache"("query_hash");

-- CreateIndex
CREATE INDEX "conversations_session_id_idx" ON "conversations"("session_id");

-- CreateIndex
CREATE INDEX "conversations_created_at_idx" ON "conversations"("created_at");

-- CreateIndex
CREATE INDEX "response_cache_query_hash_idx" ON "response_cache"("query_hash");

-- CreateIndex
CREATE INDEX "response_cache_expires_at_idx" ON "response_cache"("expires_at");
