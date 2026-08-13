-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- CreateEnum
CREATE TYPE "article_visibility" AS ENUM ('public', 'private', 'password');

-- CreateEnum
CREATE TYPE "comment_status" AS ENUM ('pending', 'approved', 'rejected', 'spam');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('image', 'video', 'audio', 'document', 'other');

-- CreateEnum
CREATE TYPE "storage_provider" AS ENUM ('s3', 'r2', 'minio');

-- CreateEnum
CREATE TYPE "page_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "menu_item_type" AS ENUM ('internal', 'external', 'category', 'page');

-- CreateEnum
CREATE TYPE "setting_type" AS ENUM ('string', 'number', 'boolean', 'json');

-- CreateEnum
CREATE TYPE "command_receipt_status" AS ENUM ('processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "outbox_delivery_status" AS ENUM ('pending', 'leased', 'enqueued', 'acked', 'dead');

-- CreateEnum
CREATE TYPE "consumer_inbox_status" AS ENUM ('processing', 'retryable', 'completed', 'dead');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" VARCHAR(320) NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "avatar_id" UUID,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "ip" INET,
    "user_agent" VARCHAR(500),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3),

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "title" VARCHAR(240) NOT NULL,
    "slug" VARCHAR(240) NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "content_html" TEXT,
    "cover_id" UUID,
    "author_id" UUID NOT NULL,
    "category_id" UUID,
    "status" "article_status" NOT NULL DEFAULT 'draft',
    "visibility" "article_visibility" NOT NULL DEFAULT 'public',
    "password_hash" VARCHAR(255),
    "seo_title" VARCHAR(240),
    "seo_description" VARCHAR(500),
    "canonical_url" VARCHAR(2048),
    "allow_comment" BOOLEAN NOT NULL DEFAULT true,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "reading_time" INTEGER NOT NULL DEFAULT 0,
    "view_count" BIGINT NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMPTZ(3),
    "scheduled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_revisions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "article_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "parent_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "cover_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "seo_title" VARCHAR(240),
    "seo_description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_tags" (
    "article_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_tags_pkey" PRIMARY KEY ("article_id","tag_id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "article_id" UUID NOT NULL,
    "user_id" UUID,
    "parent_id" UUID,
    "reply_to_id" UUID,
    "nickname" VARCHAR(120),
    "email" VARCHAR(320),
    "website" VARCHAR(2048),
    "content" TEXT NOT NULL,
    "status" "comment_status" NOT NULL DEFAULT 'pending',
    "ip" INET,
    "user_agent" VARCHAR(500),
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "filename" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "media_type" "media_type" NOT NULL,
    "mime_type" VARCHAR(160) NOT NULL,
    "extension" VARCHAR(32),
    "size" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storage_provider" "storage_provider" NOT NULL,
    "bucket" VARCHAR(255) NOT NULL,
    "object_key" VARCHAR(1024) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "hash" CHAR(64),
    "blurhash" VARCHAR(255),
    "uploader_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "title" VARCHAR(240) NOT NULL,
    "slug" VARCHAR(240) NOT NULL,
    "content" TEXT NOT NULL,
    "content_html" TEXT,
    "status" "page_status" NOT NULL DEFAULT 'draft',
    "seo_title" VARCHAR(240),
    "seo_description" VARCHAR(500),
    "author_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "menu_id" UUID NOT NULL,
    "parent_id" UUID,
    "type" "menu_item_type" NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "url" VARCHAR(2048),
    "page_id" UUID,
    "category_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(160) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "description" VARCHAR(500),
    "logo_url" VARCHAR(2048),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "key" VARCHAR(160) NOT NULL,
    "value" JSONB NOT NULL,
    "type" "setting_type" NOT NULL,
    "description" VARCHAR(500),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID,
    "action" VARCHAR(160) NOT NULL,
    "resource" VARCHAR(120) NOT NULL,
    "resource_id" VARCHAR(128),
    "before" JSONB,
    "after" JSONB,
    "ip" INET,
    "user_agent" VARCHAR(500),
    "request_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_view_daily" (
    "article_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "visitors" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "article_view_daily_pkey" PRIMARY KEY ("article_id","date")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID,
    "provider" VARCHAR(80) NOT NULL,
    "model" VARCHAR(160) NOT NULL,
    "feature" VARCHAR(120) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL,
    "cost" DECIMAL(18,8),
    "request_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_receipts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "command_type" VARCHAR(120) NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status" "command_receipt_status" NOT NULL DEFAULT 'processing',
    "result" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "command_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "event_name" VARCHAR(120) NOT NULL,
    "event_version" SMALLINT NOT NULL,
    "aggregate_type" VARCHAR(64) NOT NULL,
    "aggregate_id" VARCHAR(128) NOT NULL,
    "aggregate_sequence" BIGINT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "correlation_id" VARCHAR(128),
    "causation_id" VARCHAR(128),
    "actor_id" VARCHAR(128),
    "traceparent" VARCHAR(256),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_deliveries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "event_id" UUID NOT NULL,
    "consumer_key" VARCHAR(120) NOT NULL,
    "queue_name" VARCHAR(120) NOT NULL,
    "job_name" VARCHAR(120) NOT NULL,
    "status" "outbox_delivery_status" NOT NULL DEFAULT 'pending',
    "dispatch_attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_owner" VARCHAR(128),
    "lease_expires_at" TIMESTAMPTZ(3),
    "bullmq_job_id" VARCHAR(200),
    "enqueued_at" TIMESTAMPTZ(3),
    "acknowledged_at" TIMESTAMPTZ(3),
    "dead_lettered_at" TIMESTAMPTZ(3),
    "last_error_kind" VARCHAR(64),
    "last_error_code" VARCHAR(64),
    "last_error_summary" VARCHAR(500),
    "last_error_at" TIMESTAMPTZ(3),
    "replay_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbox_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_inbox" (
    "consumer_key" VARCHAR(120) NOT NULL,
    "event_id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "status" "consumer_inbox_status" NOT NULL DEFAULT 'processing',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "lease_owner" VARCHAR(128),
    "lease_expires_at" TIMESTAMPTZ(3),
    "aggregate_type" VARCHAR(64),
    "aggregate_id" VARCHAR(128),
    "aggregate_sequence" BIGINT,
    "first_received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    "last_error_kind" VARCHAR(64),
    "last_error_code" VARCHAR(64),
    "last_error_summary" VARCHAR(500),
    "last_error_at" TIMESTAMPTZ(3),

    CONSTRAINT "consumer_inbox_pkey" PRIMARY KEY ("consumer_key","event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_uq" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_uq" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_status_created_idx" ON "users"("status", "created_at");

-- CreateIndex
CREATE INDEX "users_deleted_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "login_sessions_token_hash_uq" ON "login_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "login_sessions_user_expires_idx" ON "login_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "login_sessions_expires_idx" ON "login_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_uq" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_uq" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_uq" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_published_idx" ON "articles"("status", "published_at");

-- CreateIndex
CREATE INDEX "articles_category_status_published_idx" ON "articles"("category_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "articles_author_status_idx" ON "articles"("author_id", "status");

-- CreateIndex
CREATE INDEX "articles_scheduled_status_idx" ON "articles"("scheduled_at", "status");

-- CreateIndex
CREATE INDEX "articles_deleted_idx" ON "articles"("deleted_at");

-- CreateIndex
CREATE INDEX "article_revisions_creator_idx" ON "article_revisions"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_revisions_article_version_uq" ON "article_revisions"("article_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_uq" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_sort_idx" ON "categories"("parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "categories_deleted_idx" ON "categories"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_uq" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_uq" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "article_tags_tag_idx" ON "article_tags"("tag_id");

-- CreateIndex
CREATE INDEX "comments_article_status_created_idx" ON "comments"("article_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "comments_parent_created_idx" ON "comments"("parent_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_user_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "comments_deleted_idx" ON "comments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "media_object_key_uq" ON "media"("object_key");

-- CreateIndex
CREATE INDEX "media_uploader_created_idx" ON "media"("uploader_id", "created_at");

-- CreateIndex
CREATE INDEX "media_type_created_idx" ON "media"("media_type", "created_at");

-- CreateIndex
CREATE INDEX "media_deleted_idx" ON "media"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_uq" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_status_published_idx" ON "pages"("status", "published_at");

-- CreateIndex
CREATE INDEX "pages_deleted_idx" ON "pages"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "menus_code_uq" ON "menus"("code");

-- CreateIndex
CREATE INDEX "menu_items_menu_parent_sort_idx" ON "menu_items"("menu_id", "parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "menu_items_page_idx" ON "menu_items"("page_id");

-- CreateIndex
CREATE INDEX "menu_items_category_idx" ON "menu_items"("category_id");

-- CreateIndex
CREATE INDEX "links_visible_sort_idx" ON "links"("is_visible", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_uq" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_public_key_idx" ON "settings"("is_public", "key");

-- CreateIndex
CREATE INDEX "audit_logs_user_created_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_created_idx" ON "audit_logs"("resource", "resource_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_request_idx" ON "audit_logs"("request_id");

-- CreateIndex
CREATE INDEX "article_view_daily_date_idx" ON "article_view_daily"("date");

-- CreateIndex
CREATE INDEX "ai_usage_user_created_idx" ON "ai_usage"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_provider_model_created_idx" ON "ai_usage"("provider", "model", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_request_idx" ON "ai_usage"("request_id");

-- CreateIndex
CREATE INDEX "command_receipts_status_created_idx" ON "command_receipts"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "command_receipts_type_key_uq" ON "command_receipts"("command_type", "idempotency_key");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_idx" ON "outbox_events"("aggregate_type", "aggregate_id", "aggregate_sequence");

-- CreateIndex
CREATE INDEX "outbox_events_correlation_idx" ON "outbox_events"("correlation_id", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_created_idx" ON "outbox_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_dedupe_uq" ON "outbox_events"("aggregate_type", "aggregate_id", "aggregate_sequence", "event_name");

-- CreateIndex
CREATE INDEX "outbox_deliveries_claim_idx" ON "outbox_deliveries"("status", "next_attempt_at", "created_at", "id");

-- CreateIndex
CREATE INDEX "outbox_deliveries_lease_idx" ON "outbox_deliveries"("status", "lease_expires_at");

-- CreateIndex
CREATE INDEX "outbox_deliveries_unacked_idx" ON "outbox_deliveries"("status", "enqueued_at");

-- CreateIndex
CREATE INDEX "outbox_deliveries_dead_idx" ON "outbox_deliveries"("status", "dead_lettered_at");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_deliveries_event_consumer_uq" ON "outbox_deliveries"("event_id", "consumer_key");

-- CreateIndex
CREATE INDEX "consumer_inbox_lease_idx" ON "consumer_inbox"("status", "lease_expires_at");

-- CreateIndex
CREATE INDEX "consumer_inbox_aggregate_idx" ON "consumer_inbox"("aggregate_type", "aggregate_id", "aggregate_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_inbox_delivery_uq" ON "consumer_inbox"("consumer_key", "delivery_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_id_fkey" FOREIGN KEY ("cover_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_cover_id_fkey" FOREIGN KEY ("cover_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_view_daily" ADD CONSTRAINT "article_view_daily_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_deliveries" ADD CONSTRAINT "outbox_deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "outbox_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
