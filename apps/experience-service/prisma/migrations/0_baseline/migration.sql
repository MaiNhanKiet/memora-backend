-- experience-service baseline: BM04 schema from db/MEMORA_BM04_PostgreSQL_74_tables.sql.
-- Same-service objects only. Cross-service foreign keys are not created (see db/MEMORA_BM04_Drop_Cross_Service_FKs.sql).
-- Already present on existing databases: mark as applied with `prisma migrate resolve --applied 0_baseline`.

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

CREATE SCHEMA IF NOT EXISTS memory;

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE memory.memory_cards (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_id UUID NOT NULL,
    owner_customer_identity_id UUID NOT NULL,
    owner_email public.citext NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    activated_at TIMESTAMPTZ,
    pin_hash TEXT,
    pin_failed_attempts SMALLINT NOT NULL DEFAULT 0,
    pin_locked_until TIMESTAMPTZ,
    pin_updated_at TIMESTAMPTZ,
    ar_target_asset_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE memory.memory_contents (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    memory_card_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    title VARCHAR(200),
    text_content TEXT,
    asset_key TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    created_by_customer_identity_id UUID,
    layout_json JSONB
);

CREATE TABLE memory.access_grants (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    memory_card_id UUID NOT NULL,
    grantee_user_id UUID,
    grantee_email public.citext NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    invitation_token_hash VARCHAR(128),
    invite_expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    linked_to_account_at TIMESTAMPTZ,
    revoked_by_user_id UUID,
    revoked_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform.lightrag_knowledge_documents (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    document_key VARCHAR(100) NOT NULL,
    title VARCHAR(250) NOT NULL,
    document_type VARCHAR(80),
    source_asset_key TEXT NOT NULL,
    version_no INTEGER NOT NULL DEFAULT 1,
    supersedes_document_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    checksum VARCHAR(128) NOT NULL,
    qdrant_collection VARCHAR(120),
    index_version VARCHAR(80),
    uploaded_by_user_id UUID NOT NULL,
    reviewed_by_user_id UUID,
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lightrag_doc_id VARCHAR(160),
    ingestion_status VARCHAR(24) NOT NULL DEFAULT 'NOT_STARTED',
    indexed_at TIMESTAMPTZ,
    lightrag_workspace VARCHAR(100) NOT NULL DEFAULT 'memora_consultation',
    normalized_asset_key TEXT,
    last_ingestion_error TEXT,
    reviewed_at TIMESTAMPTZ,
    index_config_json JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE platform.ai_conversations (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    guest_session_id VARCHAR(120),
    title VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    context_json JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

CREATE TABLE platform.ai_messages (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    role VARCHAR(15) NOT NULL,
    content TEXT NOT NULL,
    structured_context_json JSONB DEFAULT '{}'::jsonb,
    trace_id VARCHAR(120),
    retrieval_query TEXT,
    retrieval_trace_json JSONB DEFAULT '{}'::jsonb,
    model_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform.evidence_assets (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    owner_type VARCHAR(40) NOT NULL,
    owner_id UUID NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(120),
    checksum VARCHAR(128),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    created_by_customer_identity_id UUID
);

CREATE TABLE platform.notifications (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    recipient_user_id UUID,
    recipient_email public.citext,
    notification_type VARCHAR(60) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
    reference_type VARCHAR(40),
    reference_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    recipient_customer_identity_id UUID
);

CREATE TABLE platform.audit_logs (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    request_id VARCHAR(120),
    trace_id VARCHAR(120),
    result_status VARCHAR(20),
    change_summary_json JSONB DEFAULT '{}'::jsonb,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_customer_identity_id UUID
);

CREATE TABLE platform.share_links (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    created_by_user_id UUID,
    guest_session_id VARCHAR(120),
    ring_template_id UUID,
    ring_design_draft_id UUID,
    token_hash VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    sanitized_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform.system_configurations (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    config_key VARCHAR(120) NOT NULL,
    config_value_json JSONB NOT NULL,
    value_type VARCHAR(30) NOT NULL,
    version_no INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    updated_by_user_id UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform.privacy_requests (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    request_no VARCHAR(50) NOT NULL,
    requester_customer_identity_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    status VARCHAR(25) NOT NULL DEFAULT 'SUBMITTED',
    assigned_admin_user_id UUID,
    scope_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolution_summary_json JSONB,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE memory.memory_cards ADD CONSTRAINT memory_memory_cards_a875f08b_ck CHECK (status IN ('PENDING','ACTIVE','DISABLED','DELETED'));

ALTER TABLE memory.memory_cards ADD CONSTRAINT memory_memory_cards_e5c0cf0c_ck CHECK (pin_failed_attempts>=0);

ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_e7c67353_ck CHECK (content_type IN ('TEXT','IMAGE','AUDIO','VIDEO'));

ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_cfdbf519_ck CHECK ((content_type='TEXT' AND text_content IS NOT NULL AND btrim(text_content)<>'') OR (content_type<>'TEXT' AND asset_key IS NOT NULL));

ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_82de98d3_ck CHECK (sort_order>=0);

ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_fa8d4372_ck CHECK (status IN ('ACTIVE','HIDDEN','DELETED'));

ALTER TABLE memory.access_grants ADD CONSTRAINT memory_access_grants_b06aab3c_ck CHECK (status IN ('PENDING','ACTIVE','REVOKED','EXPIRED'));

ALTER TABLE platform.lightrag_knowledge_documents ADD CONSTRAINT platform_lightrag_knowledge_documents_ecdf4f68_ck CHECK (version_no>=1);

ALTER TABLE platform.lightrag_knowledge_documents ADD CONSTRAINT platform_lightrag_knowledge_documents_ca45e10a_ck CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','OBSOLETE'));

ALTER TABLE platform.lightrag_knowledge_documents ADD CONSTRAINT platform_lightrag_knowledge_documents_02ed286e_ck CHECK (ingestion_status IN ('NOT_STARTED','QUEUED','PROCESSING','INDEXED','FAILED','REMOVING','REMOVED'));

ALTER TABLE platform.ai_conversations ADD CONSTRAINT platform_ai_conversations_3b19398a_ck CHECK (num_nonnulls(user_id,guest_session_id)=1);

ALTER TABLE platform.ai_conversations ADD CONSTRAINT platform_ai_conversations_6fc69b21_ck CHECK (status IN ('ACTIVE','CLOSED','DELETED'));

ALTER TABLE platform.ai_messages ADD CONSTRAINT platform_ai_messages_e7c868b9_ck CHECK (role IN ('USER','ASSISTANT','SYSTEM'));

ALTER TABLE platform.evidence_assets ADD CONSTRAINT platform_evidence_assets_d217530f_ck CHECK (owner_type IN ('PRODUCTION_STEP','QC_RESULT','CLAIM','CLAIM_EVENT','CUSTODY_EVENT','DELIVERY','HANDOVER'));

ALTER TABLE platform.notifications ADD CONSTRAINT platform_notifications_9f5e6119_ck CHECK (recipient_user_id IS NOT NULL OR recipient_email IS NOT NULL);

ALTER TABLE platform.notifications ADD CONSTRAINT platform_notifications_5a42c783_ck CHECK (channel IN ('IN_APP','EMAIL'));

ALTER TABLE platform.notifications ADD CONSTRAINT platform_notifications_5b23926f_ck CHECK (status IN ('PENDING','SENT','READ','FAILED'));

ALTER TABLE platform.share_links ADD CONSTRAINT platform_share_links_d8a40fff_ck CHECK (num_nonnulls(created_by_user_id,guest_session_id)=1);

ALTER TABLE platform.share_links ADD CONSTRAINT platform_share_links_4cb976d6_ck CHECK (num_nonnulls(ring_template_id,ring_design_draft_id)=1);

ALTER TABLE platform.share_links ADD CONSTRAINT platform_share_links_6225ca33_ck CHECK (status IN ('ACTIVE','REVOKED','EXPIRED'));

ALTER TABLE platform.system_configurations ADD CONSTRAINT platform_system_configurations_ecdf4f68_ck CHECK (version_no>=1);

ALTER TABLE platform.system_configurations ADD CONSTRAINT platform_system_configurations_85827548_ck CHECK (status IN ('DRAFT','ACTIVE','INACTIVE'));

ALTER TABLE platform.system_configurations ADD CONSTRAINT platform_system_configurations_36d73e03_ck CHECK (effective_to IS NULL OR effective_to>effective_from);

ALTER TABLE platform.privacy_requests ADD CONSTRAINT platform_privacy_requests_d0311704_ck CHECK (request_type IN ('EXPORT_DATA','DELETE_PERSONALIZATION_DATA','DELETE_DIGITAL_MEMORY','REVOKE_SHARED_ACCESS'));

ALTER TABLE platform.privacy_requests ADD CONSTRAINT platform_privacy_requests_dd163bac_ck CHECK (status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','PROCESSING','COMPLETED','FAILED'));

CREATE UNIQUE INDEX memory_memory_cards_ring_item_id_13e03f7_uq ON memory.memory_cards (ring_item_id);

CREATE UNIQUE INDEX platform_lightrag_knowledge_documents_document_key_v_a2b3d73f ON platform.lightrag_knowledge_documents (document_key, version_no);

CREATE UNIQUE INDEX platform_lightrag_knowledge_documents_lightrag_works_5f568d67 ON platform.lightrag_knowledge_documents (lightrag_workspace, lightrag_doc_id) WHERE lightrag_doc_id IS NOT NULL;

CREATE UNIQUE INDEX platform_share_links_token_hash_5ce3596_uq ON platform.share_links (token_hash);

CREATE UNIQUE INDEX platform_system_configurations_config_key_version_no_de4f45d1 ON platform.system_configurations (config_key, version_no);

CREATE UNIQUE INDEX platform_privacy_requests_request_no_8ef5662_uq ON platform.privacy_requests (request_no);

ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_memory_card_id_fk FOREIGN KEY (memory_card_id) REFERENCES memory.memory_cards (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE memory.access_grants ADD CONSTRAINT memory_access_grants_memory_card_id_fk FOREIGN KEY (memory_card_id) REFERENCES memory.memory_cards (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE platform.lightrag_knowledge_documents ADD CONSTRAINT platform_lightrag_knowledge_documents_supersedes_doc_2a6e2e80 FOREIGN KEY (supersedes_document_id) REFERENCES platform.lightrag_knowledge_documents (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE platform.ai_messages ADD CONSTRAINT platform_ai_messages_conversation_id_fk FOREIGN KEY (conversation_id) REFERENCES platform.ai_conversations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
