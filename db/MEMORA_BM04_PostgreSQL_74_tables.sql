-- ============================================================================
-- MEMORA — BM04 REVIEW 2 — PostgreSQL logical schema initialization
-- Source: MEMORA – DATABASE DOMAIN & TABLE TRACKER (2026-11-12 snapshot)
-- Baseline: 12 schemas | 74 tables | 960 columns | 225 proposed FK relations
-- PostgreSQL 15+; single PostgreSQL database with domain schemas (D15 PROPOSED).
-- DDL DESIGN PROPOSAL ONLY. Not applied to the existing MEMORA databases.
-- Fresh EMPTY database only. Review architecture and D30/D31 before migration.
-- ============================================================================

BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS pricing;
CREATE SCHEMA IF NOT EXISTS design;
CREATE SCHEMA IF NOT EXISTS ordering;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS personalization;
CREATE SCHEMA IF NOT EXISTS production;
CREATE SCHEMA IF NOT EXISTS fulfillment;
CREATE SCHEMA IF NOT EXISTS memory;
CREATE SCHEMA IF NOT EXISTS after_sales;
CREATE SCHEMA IF NOT EXISTS platform;


-- ===== IAM : 6 tables =====
-- iam.users
CREATE TABLE iam.users (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL,
    password_hash TEXT,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    google_sub VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email_verified_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    terms_version VARCHAR(50),
    terms_accepted_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- iam.customer_identities
CREATE TABLE iam.customer_identities (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    is_primary_for_user BOOLEAN NOT NULL DEFAULT false,
    display_name VARCHAR(150),
    contact_email CITEXT NOT NULL,
    contact_phone VARCHAR(30),
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    account_linked_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- iam.roles
CREATE TABLE iam.roles (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- iam.permissions
CREATE TABLE iam.permissions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- iam.user_roles
CREATE TABLE iam.user_roles (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_by_user_id UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT
);

-- iam.role_permissions
CREATE TABLE iam.role_permissions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    granted_by_user_id UUID,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== CATALOG : 7 tables =====
-- catalog.ring_templates
CREATE TABLE catalog.ring_templates (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(60) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    glb_asset_key TEXT NOT NULL,
    stone_layout VARCHAR(20) NOT NULL DEFAULT 'NONE',
    design_supported_personalization_packages TEXT[] NOT NULL DEFAULT '{NONE}',
    theta_min_deg NUMERIC(8,3),
    theta_max_deg NUMERIC(8,3),
    v_min_mm NUMERIC(8,3),
    v_max_mm NUMERIC(8,3),
    boundary_json JSONB,
    forbidden_zones_json JSONB DEFAULT '[]'::jsonb,
    placement_tolerance_mm NUMERIC(8,3),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- catalog.materials
CREATE TABLE catalog.materials (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    material_family VARCHAR(50),
    purity_percent NUMERIC(5,2),
    color VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- catalog.template_variants
CREATE TABLE catalog.template_variants (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_template_id UUID NOT NULL,
    material_id UUID NOT NULL,
    standard_size NUMERIC(6,2) NOT NULL,
    max_up_delta NUMERIC(6,2),
    max_down_delta NUMERIC(6,2),
    resize_method VARCHAR(80),
    added_metal_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    local_wall_thickness_mm NUMERIC(8,3) NOT NULL,
    min_remaining_wall_thickness_mm NUMERIC(8,3) NOT NULL,
    max_safe_engraving_depth_mm NUMERIC(8,3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- catalog.gemstone_options
CREATE TABLE catalog.gemstone_options (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(60) NOT NULL,
    name VARCHAR(150) NOT NULL,
    stone_type VARCHAR(80) NOT NULL,
    shape VARCHAR(60) NOT NULL,
    length_mm NUMERIC(8,3) NOT NULL,
    width_mm NUMERIC(8,3) NOT NULL,
    color_grade VARCHAR(50),
    clarity_grade VARCHAR(50),
    certified_required BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- catalog.gemstone_groups
CREATE TABLE catalog.gemstone_groups (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_template_id UUID NOT NULL,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(120),
    selection_mode VARCHAR(20) NOT NULL DEFAULT 'INDEPENDENT',
    is_required BOOLEAN NOT NULL DEFAULT false,
    sequence_no SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- catalog.gemstone_slots
CREATE TABLE catalog.gemstone_slots (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    gemstone_group_id UUID NOT NULL,
    code VARCHAR(60) NOT NULL,
    slot_index SMALLINT NOT NULL,
    glb_node_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- catalog.template_compatibilities
CREATE TABLE catalog.template_compatibilities (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    template_variant_id UUID NOT NULL,
    gemstone_group_id UUID NOT NULL,
    gemstone_option_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== PRICING : 3 tables =====
-- pricing.price_items
CREATE TABLE pricing.price_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    price_type VARCHAR(30) NOT NULL,
    template_variant_id UUID,
    gemstone_option_id UUID,
    certified_gemstone_id UUID,
    personalization_package VARCHAR(20),
    code VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pricing.price_versions
CREATE TABLE pricing.price_versions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    price_item_id UUID NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    version_no INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(25) NOT NULL DEFAULT 'DRAFT',
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    source_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    market_snapshot_json JSONB,
    review_note TEXT,
    created_by_user_id UUID,
    reviewed_by_user_id UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pricing.pricing_rules
CREATE TABLE pricing.pricing_rules (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    rule_type VARCHAR(30) NOT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    template_variant_id UUID,
    resize_direction VARCHAR(10),
    delivery_zone_code VARCHAR(50),
    cancellation_stage VARCHAR(40),
    redelivery_reason VARCHAR(50),
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    version_no INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    created_by_user_id UUID,
    approved_by_user_id UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== DESIGN : 3 tables =====
-- design.carts
CREATE TABLE design.carts (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    guest_session_id VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- design.ring_design_drafts
CREATE TABLE design.ring_design_drafts (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    cart_id UUID,
    owner_user_id UUID,
    guest_session_id VARCHAR(120),
    template_variant_id UUID NOT NULL,
    target_size NUMERIC(6,2) NOT NULL,
    gemstone_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    personalization_package VARCHAR(20) NOT NULL DEFAULT 'NONE',
    memory_enabled BOOLEAN NOT NULL DEFAULT false,
    estimated_price NUMERIC(18,2),
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    estimated_price_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_CART',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- design.design_codes
CREATE TABLE design.design_codes (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_design_draft_id UUID NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_into_draft_id UUID,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== ORDERING : 10 tables =====
-- ordering.orders
CREATE TABLE ordering.orders (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_no VARCHAR(40) NOT NULL,
    owner_customer_identity_id UUID NOT NULL,
    guest_email CITEXT,
    guest_phone VARCHAR(30),
    guest_email_verified_at TIMESTAMPTZ,
    created_from_cart_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_P1',
    source_plan_mode VARCHAR(15) NOT NULL DEFAULT 'N/A',
    pre_p1_notice_version VARCHAR(50),
    privacy_notice_acknowledged_at TIMESTAMPTZ,
    p1_nonrefund_acknowledged_at TIMESTAMPTZ,
    pre_p1_evidence_json JSONB,
    fulfillment_mode VARCHAR(20),
    recipient_name VARCHAR(150),
    recipient_email CITEXT,
    recipient_phone VARCHAR(30),
    delivery_address_json JSONB,
    current_quote_id UUID,
    invoice_no VARCHAR(60),
    invoice_asset_key TEXT,
    invoice_issued_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ordering.ring_items
CREATE TABLE ordering.ring_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    item_no SMALLINT NOT NULL,
    source_ring_design_draft_id UUID NOT NULL,
    current_version_id UUID,
    warranty_started_at TIMESTAMPTZ,
    warranty_expires_at TIMESTAMPTZ,
    warranty_policy_version VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ordering.ring_item_versions
CREATE TABLE ordering.ring_item_versions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_id UUID NOT NULL,
    version_no INTEGER NOT NULL,
    parent_version_id UUID,
    template_variant_id UUID NOT NULL,
    target_size NUMERIC(6,2) NOT NULL,
    personalization_package VARCHAR(20) NOT NULL DEFAULT 'NONE',
    memory_enabled BOOLEAN NOT NULL DEFAULT false,
    preview_snapshot_json JSONB,
    status VARCHAR(25) NOT NULL DEFAULT 'DRAFT',
    change_reason TEXT,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_customer_identity_id UUID
);

-- ordering.ring_item_version_gemstones
CREATE TABLE ordering.ring_item_version_gemstones (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_version_id UUID NOT NULL,
    gemstone_slot_id UUID NOT NULL,
    gemstone_option_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ordering.quotes
CREATE TABLE ordering.quotes (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    quote_no VARCHAR(50) NOT NULL,
    order_id UUID,
    claim_id UUID,
    quote_type VARCHAR(20) NOT NULL,
    version_no INTEGER NOT NULL DEFAULT 1,
    supersedes_quote_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    subtotal_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    delivery_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    adjustment_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    valid_until TIMESTAMPTZ,
    created_by_user_id UUID,
    issued_at TIMESTAMPTZ,
    accepted_by_customer_identity_id UUID,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ordering.quote_items
CREATE TABLE ordering.quote_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    ring_item_id UUID,
    component_type VARCHAR(30) NOT NULL,
    description TEXT,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    unit_amount NUMERIC(18,2) NOT NULL,
    line_amount NUMERIC(18,2) NOT NULL,
    price_source_type VARCHAR(30) NOT NULL,
    price_version_id UUID,
    pricing_rule_id UUID,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ordering.final_confirmations
CREATE TABLE ordering.final_confirmations (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    quote_id UUID NOT NULL,
    confirmed_by_customer_identity_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    invalidated_at TIMESTAMPTZ,
    invalidation_reason TEXT
);

-- ordering.final_confirmation_items
CREATE TABLE ordering.final_confirmation_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    final_confirmation_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    ring_item_version_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ordering.payment_transactions
CREATE TABLE ordering.payment_transactions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID,
    claim_id UUID,
    quote_id UUID,
    payment_stage VARCHAR(25) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'PAYMENT',
    provider VARCHAR(30),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'PAYOS',
    recorded_by_user_id UUID,
    provider_order_code BIGINT,
    provider_transaction_id VARCHAR(150),
    provider_reference VARCHAR(150),
    related_transaction_id UUID,
    amount NUMERIC(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    receipt_no VARCHAR(60),
    receipt_asset_key TEXT,
    receipt_issued_at TIMESTAMPTZ,
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- ordering.payment_item_allocations
CREATE TABLE ordering.payment_item_allocations (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    payment_transaction_id UUID NOT NULL,
    ring_item_id UUID,
    original_allocation_id UUID,
    allocated_amount NUMERIC(18,2) NOT NULL,
    allocation_kind VARCHAR(20) NOT NULL,
    basis_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== INVENTORY : 4 tables =====
-- inventory.stock_lots
CREATE TABLE inventory.stock_lots (
    id UUID PRIMARY KEY NOT NULL,
    stock_code VARCHAR(60) NOT NULL,
    stock_type VARCHAR(20) NOT NULL,
    template_variant_id UUID,
    gemstone_option_id UUID,
    lot_code VARCHAR(80),
    supplier_ref VARCHAR(120),
    quantity_on_hand INTEGER NOT NULL,
    quantity_reserved INTEGER NOT NULL,
    unit_cost NUMERIC(18,2),
    location_code VARCHAR(80),
    status VARCHAR(20) NOT NULL,
    received_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL
);

-- inventory.certified_gemstones
CREATE TABLE inventory.certified_gemstones (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    internal_code VARCHAR(80) NOT NULL,
    gemstone_option_id UUID NOT NULL,
    certificate_provider VARCHAR(100),
    certificate_number VARCHAR(150),
    certificate_url TEXT,
    certificate_metadata_json JSONB DEFAULT '{}'::jsonb,
    purchase_cost NUMERIC(18,2),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    location_code VARCHAR(80),
    received_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- inventory.allocations
CREATE TABLE inventory.allocations (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_id UUID NOT NULL,
    production_attempt_id UUID,
    stock_lot_id UUID,
    certified_gemstone_id UUID,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'HOLD',
    expires_at TIMESTAMPTZ,
    allocated_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- inventory.inventory_movements
CREATE TABLE inventory.inventory_movements (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    movement_type VARCHAR(25) NOT NULL,
    stock_lot_id UUID,
    certified_gemstone_id UUID,
    allocation_id UUID,
    ring_item_id UUID,
    production_attempt_id UUID,
    quantity INTEGER NOT NULL,
    unit_cost_snapshot NUMERIC(18,2),
    reason TEXT,
    performed_by_user_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata_json JSONB DEFAULT '{}'::jsonb
);


-- ===== PERSONALIZATION : 9 tables =====
-- personalization.personalization_sources
CREATE TABLE personalization.personalization_sources (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    owner_customer_identity_id UUID NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING',
    raw_asset_key TEXT,
    processed_asset_key TEXT,
    vector_asset_key TEXT,
    raw_checksum VARCHAR(128),
    vector_checksum VARCHAR(128),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    captured_or_uploaded_by_user_id UUID,
    captured_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    delete_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- personalization.source_bindings
CREATE TABLE personalization.source_bindings (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    personalization_source_id UUID NOT NULL,
    binding_mode VARCHAR(15) NOT NULL,
    bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at TIMESTAMPTZ
);

-- personalization.consents
CREATE TABLE personalization.consents (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    customer_identity_id UUID NOT NULL,
    order_id UUID,
    personalization_source_id UUID,
    consent_type VARCHAR(50) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED',
    accepted_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    channel VARCHAR(30),
    evidence_metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- personalization.consent_ring_items
CREATE TABLE personalization.consent_ring_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    consent_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- personalization.capture_sessions
CREATE TABLE personalization.capture_sessions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    consent_id UUID NOT NULL,
    source_plan_mode VARCHAR(15) NOT NULL,
    device_code VARCHAR(80),
    staff_user_id UUID NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'CREATED',
    accepted_source_id UUID,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- personalization.capture_attempts
CREATE TABLE personalization.capture_attempts (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    capture_session_id UUID NOT NULL,
    attempt_no SMALLINT NOT NULL,
    quality_score NUMERIC(10,3),
    quality_threshold_snapshot NUMERIC(10,3),
    result VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(100),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- personalization.personalization_placements
CREATE TABLE personalization.personalization_placements (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_version_id UUID NOT NULL,
    personalization_source_id UUID NOT NULL,
    center_angle_deg NUMERIC(8,3) NOT NULL,
    axial_offset_mm NUMERIC(8,3) NOT NULL,
    width_mm NUMERIC(8,3) NOT NULL,
    height_mm NUMERIC(8,3) NOT NULL,
    rotation_deg NUMERIC(8,3) NOT NULL DEFAULT 0,
    mapping_version VARCHAR(50) NOT NULL,
    segment_start_ms INTEGER,
    segment_end_ms INTEGER,
    vector_asset_key TEXT NOT NULL,
    placement_hash VARCHAR(128) NOT NULL,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_customer_identity_id UUID
);

-- personalization.design_reviews
CREATE TABLE personalization.design_reviews (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_version_id UUID NOT NULL,
    review_type VARCHAR(30) NOT NULL,
    actor_user_id UUID,
    decision VARCHAR(25) NOT NULL,
    notes TEXT,
    review_evidence_json JSONB DEFAULT '{}'::jsonb,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_customer_identity_id UUID
);

-- personalization.change_requests
CREATE TABLE personalization.change_requests (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    from_version_id UUID NOT NULL,
    requested_by_customer_identity_id UUID NOT NULL,
    requested_changes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'SUBMITTED',
    reviewed_by_user_id UUID,
    reviewed_at TIMESTAMPTZ,
    decision_note TEXT,
    created_version_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== PRODUCTION : 13 tables =====
-- production.design_locks
CREATE TABLE production.design_locks (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    final_confirmation_id UUID NOT NULL,
    lock_version INTEGER NOT NULL DEFAULT 1,
    lock_hash VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    locked_by_user_id UUID,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.design_lock_items
CREATE TABLE production.design_lock_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    design_lock_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    ring_item_version_id UUID NOT NULL,
    item_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.production_packages
CREATE TABLE production.production_packages (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    package_no VARCHAR(50) NOT NULL,
    ring_item_id UUID NOT NULL,
    design_lock_id UUID NOT NULL,
    ring_item_version_id UUID NOT NULL,
    template_variant_id UUID NOT NULL,
    laser_process_profile_id UUID,
    effective_wall_thickness_mm NUMERIC(8,3),
    max_safe_engraving_depth_mm NUMERIC(8,3),
    expected_engraving_depth_mm NUMERIC(8,3),
    depth_tolerance_mm NUMERIC(8,3),
    laser_process_snapshot_json JSONB DEFAULT '{}'::jsonb,
    package_version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'CURRENT',
    laser_svg_asset_key TEXT,
    laser_dxf_asset_key TEXT,
    placement_snapshot_json JSONB,
    mapping_version VARCHAR(50),
    file_checksum VARCHAR(128) NOT NULL,
    generated_by_user_id UUID,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    supersedes_package_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.laser_process_profiles
CREATE TABLE production.laser_process_profiles (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL,
    material_id UUID NOT NULL,
    machine_code VARCHAR(80),
    personalization_type VARCHAR(20) NOT NULL,
    power_pct NUMERIC(5,2),
    speed_mm_s NUMERIC(10,3),
    frequency_khz NUMERIC(10,3),
    passes INTEGER NOT NULL DEFAULT 1,
    focus_offset_mm NUMERIC(8,3),
    expected_depth_mm NUMERIC(8,3) NOT NULL,
    depth_tolerance_mm NUMERIC(8,3),
    is_default BOOLEAN NOT NULL DEFAULT false,
    version_no INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    created_by_user_id UUID,
    approved_by_user_id UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.production_routes
CREATE TABLE production.production_routes (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_template_id UUID NOT NULL,
    route_code VARCHAR(60) NOT NULL,
    steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    name VARCHAR(150) NOT NULL,
    version_no INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    created_by_user_id UUID,
    approved_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.jeweler_skills
CREATE TABLE production.jeweler_skills (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    jeweler_user_id UUID NOT NULL,
    skill_code VARCHAR(60) NOT NULL,
    level SMALLINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    verified_by_user_id UUID,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.production_attempts
CREATE TABLE production.production_attempts (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_id UUID NOT NULL,
    claim_id UUID,
    parent_attempt_id UUID,
    attempt_no INTEGER NOT NULL,
    attempt_type VARCHAR(25) NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'CREATED',
    reason TEXT,
    created_by_user_id UUID,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.work_orders
CREATE TABLE production.work_orders (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    work_order_no VARCHAR(50) NOT NULL,
    order_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    claim_id UUID,
    production_attempt_id UUID NOT NULL,
    production_package_id UUID,
    production_route_id UUID NOT NULL,
    route_version_no INTEGER NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'PLANNED',
    priority VARCHAR(15) NOT NULL DEFAULT 'NORMAL',
    target_completion_at TIMESTAMPTZ,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- production.work_order_steps
CREATE TABLE production.work_order_steps (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL,
    step_snapshot_json JSONB NOT NULL,
    sequence_no SMALLINT NOT NULL,
    step_code VARCHAR(60) NOT NULL,
    step_name VARCHAR(150) NOT NULL,
    required_skills_snapshot_json JSONB DEFAULT '[]'::jsonb,
    required_permission_code VARCHAR(80),
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING',
    performed_by_user_id UUID,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    result VARCHAR(30),
    step_data_json JSONB DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.work_order_assignments
CREATE TABLE production.work_order_assignments (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL,
    jeweler_user_id UUID NOT NULL,
    assigned_by_user_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ,
    unassigned_by_user_id UUID,
    unassigned_reason TEXT,
    required_skill_snapshot_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    jeweler_skill_snapshot_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.laser_executions
CREATE TABLE production.laser_executions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    work_order_step_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    production_package_id UUID NOT NULL,
    operator_user_id UUID NOT NULL,
    machine_code VARCHAR(80),
    laser_process_profile_id UUID NOT NULL,
    file_checksum VARCHAR(128) NOT NULL,
    actual_process_params_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    actual_passes INTEGER,
    measured_depth_mm NUMERIC(8,3),
    depth_measurement_method VARCHAR(80),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    result VARCHAR(20) NOT NULL,
    error_code VARCHAR(80),
    error_note TEXT,
    execution_metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.production_exceptions
CREATE TABLE production.production_exceptions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL,
    work_order_step_id UUID,
    production_attempt_id UUID NOT NULL,
    exception_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    requested_by_user_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by_user_id UUID,
    reviewed_at TIMESTAMPTZ,
    resolution_note TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- production.qc_results
CREATE TABLE production.qc_results (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_id UUID NOT NULL,
    production_attempt_id UUID NOT NULL,
    work_order_id UUID,
    claim_id UUID,
    qc_type VARCHAR(20) NOT NULL DEFAULT 'FINAL',
    reviewer_user_id UUID NOT NULL,
    result VARCHAR(10) NOT NULL,
    checklist_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    disposition VARCHAR(20),
    notes TEXT,
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== FULFILLMENT : 3 tables =====
-- fulfillment.handover_sessions
CREATE TABLE fulfillment.handover_sessions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    claim_id UUID,
    handover_type VARCHAR(25) NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_email CITEXT,
    recipient_phone VARCHAR(30),
    token_hash VARCHAR(128) NOT NULL,
    qr_nonce VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    expires_at TIMESTAMPTZ NOT NULL,
    verified_via VARCHAR(25),
    verified_at TIMESTAMPTZ,
    verified_by_user_id UUID,
    override_reason TEXT,
    override_approved_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fulfillment.handover_records
CREATE TABLE fulfillment.handover_records (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    handover_session_id UUID NOT NULL,
    order_id UUID NOT NULL,
    claim_id UUID,
    ring_item_id UUID,
    handed_over_items_snapshot_json JSONB,
    handover_scope VARCHAR(15) NOT NULL DEFAULT 'ORDER',
    handover_type VARCHAR(25) NOT NULL,
    verification_method VARCHAR(25) NOT NULL,
    verification_reference VARCHAR(150),
    recipient_reference VARCHAR(150),
    handover_actor_user_id UUID NOT NULL,
    evidence_asset_id UUID,
    location_code VARCHAR(120),
    record_hash VARCHAR(128) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fulfillment.deliveries
CREATE TABLE fulfillment.deliveries (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    claim_id UUID,
    attempt_no SMALLINT NOT NULL DEFAULT 1,
    parent_delivery_id UUID,
    assigned_delivery_staff_id UUID,
    assigned_by_user_id UUID,
    assigned_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    handover_session_id UUID,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_email CITEXT,
    recipient_phone VARCHAR(30),
    address_snapshot_json JSONB NOT NULL,
    delivery_zone VARCHAR(80),
    scheduled_date DATE,
    delivery_window_start TIME,
    delivery_window_end TIME,
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    failure_reason VARCHAR(50),
    adjustment_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    adjustment_reason VARCHAR(80),
    picked_up_at TIMESTAMPTZ,
    out_for_delivery_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    handover_record_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== MEMORY : 3 tables =====
-- memory.memory_cards
CREATE TABLE memory.memory_cards (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_id UUID NOT NULL,
    owner_customer_identity_id UUID NOT NULL,
    owner_email CITEXT NOT NULL,
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

-- memory.memory_contents
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

-- memory.access_grants
CREATE TABLE memory.access_grants (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    memory_card_id UUID NOT NULL,
    grantee_user_id UUID,
    grantee_email CITEXT NOT NULL,
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


-- ===== AFTER_SALES : 4 tables =====
-- after_sales.claims
CREATE TABLE after_sales.claims (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    claim_no VARCHAR(50) NOT NULL,
    claim_type VARCHAR(25) NOT NULL,
    order_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    requester_customer_identity_id UUID NOT NULL,
    created_by_user_id UUID,
    issue_category VARCHAR(80),
    description TEXT NOT NULL,
    discovered_at TIMESTAMPTZ,
    requested_resolution VARCHAR(80),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    assigned_manager_id UUID,
    target_completion_at TIMESTAMPTZ,
    processing_status VARCHAR(40),
    submitted_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    maintenance_plan_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_customer_identity_id UUID
);

-- after_sales.claim_events
CREATE TABLE after_sales.claim_events (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    actor_user_id UUID,
    decision_code VARCHAR(50),
    reason TEXT,
    policy_basis TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_customer_identity_id UUID
);

-- after_sales.maintenance_plans
CREATE TABLE after_sales.maintenance_plans (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_id UUID NOT NULL,
    plan_code VARCHAR(60) NOT NULL,
    plan_name VARCHAR(150) NOT NULL,
    coverage_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    purchased_quote_item_id UUID,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- after_sales.chain_of_custody_events
CREATE TABLE after_sales.chain_of_custody_events (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    work_order_id UUID,
    production_attempt_id UUID,
    event_type VARCHAR(40) NOT NULL,
    from_holder_type VARCHAR(30),
    from_holder_id UUID,
    to_holder_type VARCHAR(30) NOT NULL,
    to_holder_id UUID,
    from_location VARCHAR(150),
    to_location VARCHAR(150),
    condition_note TEXT,
    evidence_asset_id UUID,
    performed_by_user_id UUID NOT NULL,
    received_by_user_id UUID,
    handoff_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===== PLATFORM : 9 tables =====
-- platform.lightrag_knowledge_documents
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

-- platform.ai_conversations
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

-- platform.ai_messages
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

-- platform.evidence_assets
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

-- platform.notifications
CREATE TABLE platform.notifications (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    recipient_user_id UUID,
    recipient_email CITEXT,
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

-- platform.audit_logs
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

-- platform.share_links
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

-- platform.system_configurations
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

-- platform.privacy_requests
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

-- ===== ROW-LOCAL CHECKS =====
ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_2ffca217_ck CHECK (max_safe_engraving_depth_mm <= local_wall_thickness_mm - min_remaining_wall_thickness_mm);
ALTER TABLE pricing.price_versions ADD CONSTRAINT pricing_price_versions_661f9022_ck CHECK (amount >= 0);
ALTER TABLE pricing.price_versions ADD CONSTRAINT pricing_price_versions_36efdb79_ck CHECK (version_no > 0);
ALTER TABLE pricing.pricing_rules ADD CONSTRAINT pricing_pricing_rules_36efdb79_ck CHECK (version_no > 0);
ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_e97f5738_ck CHECK (estimated_price IS NULL OR estimated_price >= 0);
ALTER TABLE design.design_codes ADD CONSTRAINT design_design_codes_23114424_ck CHECK (status IN ('ACTIVE','USED','REVOKED','EXPIRED'));
ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_a4720edc_ck CHECK (version_no >= 1);
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_a4720edc_ck CHECK (version_no >= 1);
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_293397d4_ck CHECK (subtotal_amount >= 0);
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_bbed9c3e_ck CHECK (delivery_amount >= 0);
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_981342cc_ck CHECK (total_amount >= 0);
ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_0ccbe12f_ck CHECK (quantity > 0);
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_4e4ef718_ck CHECK (payment_method IN ('PAYOS','STORE_CASH'));
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_dce489a0_ck CHECK (amount > 0);
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_8d8117fd_ck CHECK (status IN ('PENDING','SUCCEEDED','FAILED','EXPIRED','CANCELLED'));
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_40c9a2bd_ck CHECK (expires_at IS NULL OR expires_at > requested_at);
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_fee6827d_ck CHECK (receipt_issued_at IS NULL OR (transaction_type='PAYMENT' AND status='SUCCEEDED' AND receipt_no IS NOT NULL AND receipt_asset_key IS NOT NULL));
ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_9c21991b_ck CHECK (allocated_amount>0);
ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_b13d1724_ck CHECK (allocation_kind IN ('RING_ITEM','ORDER_FEE'));
ALTER TABLE personalization.personalization_sources ADD CONSTRAINT personalization_personalization_sources_77b92709_ck CHECK (source_type IN ('FINGERPRINT','SOUNDWAVE'));
ALTER TABLE personalization.personalization_sources ADD CONSTRAINT personalization_personalization_sources_d7c2610b_ck CHECK (status IN ('PENDING','ACCEPTED','PROCESSING','READY','PROCESSING_FAILED','DELETED'));
ALTER TABLE personalization.personalization_sources ADD CONSTRAINT personalization_personalization_sources_ad3b4258_ck CHECK ((raw_asset_key IS NULL AND raw_checksum IS NULL) OR (raw_asset_key IS NOT NULL AND raw_checksum IS NOT NULL));
ALTER TABLE personalization.personalization_sources ADD CONSTRAINT personalization_personalization_sources_4f5fbc84_ck CHECK ((vector_asset_key IS NULL AND vector_checksum IS NULL) OR (vector_asset_key IS NOT NULL AND vector_checksum IS NOT NULL));
ALTER TABLE personalization.personalization_sources ADD CONSTRAINT personalization_personalization_sources_3aafb963_ck CHECK ((status='DELETED' AND deleted_at IS NOT NULL AND delete_reason IS NOT NULL AND btrim(delete_reason) <> '') OR (status <> 'DELETED' AND deleted_at IS NULL AND delete_reason IS NULL));
ALTER TABLE personalization.source_bindings ADD CONSTRAINT personalization_source_bindings_215677c3_ck CHECK (binding_mode IN ('N/A','SHARED','SEPARATE'));
ALTER TABLE personalization.source_bindings ADD CONSTRAINT personalization_source_bindings_2dc96f7d_ck CHECK (released_at IS NULL OR released_at >= bound_at);
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_4a613cf6_ck CHECK (source_plan_mode IN ('N/A','SHARED','SEPARATE'));
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_9370ba21_ck CHECK (status IN ('CREATED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','EXPIRED'));
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_5f094357_ck CHECK ((status = 'COMPLETED') = (accepted_source_id IS NOT NULL));
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_455e6206_ck CHECK ((status IN ('CREATED','IN_PROGRESS') AND ended_at IS NULL) OR (status IN ('COMPLETED','FAILED','CANCELLED','EXPIRED') AND ended_at IS NOT NULL));
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_7e7d7678_ck CHECK (ended_at IS NULL OR ended_at >= COALESCE(started_at,created_at));
ALTER TABLE personalization.capture_attempts ADD CONSTRAINT personalization_capture_attempts_f9ff5db5_ck CHECK (attempt_no BETWEEN 1 AND 3);
ALTER TABLE personalization.capture_attempts ADD CONSTRAINT personalization_capture_attempts_583953f9_ck CHECK (quality_score IS NULL OR quality_score>=0);
ALTER TABLE personalization.capture_attempts ADD CONSTRAINT personalization_capture_attempts_dd27a881_ck CHECK (quality_threshold_snapshot IS NULL OR quality_threshold_snapshot>=0);
ALTER TABLE personalization.capture_attempts ADD CONSTRAINT personalization_capture_attempts_14e4bca0_ck CHECK ((result='ACCEPTED' AND quality_score IS NOT NULL AND quality_threshold_snapshot IS NOT NULL AND quality_score>=quality_threshold_snapshot AND failure_reason IS NULL) OR (result IN ('REJECTED','ERROR') AND failure_reason IS NOT NULL));
ALTER TABLE personalization.capture_attempts ADD CONSTRAINT personalization_capture_attempts_c6dc848f_ck CHECK (result IN ('ACCEPTED','REJECTED','ERROR'));
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_eb00853e_ck CHECK (center_angle_deg >= 0 AND center_angle_deg < 360);
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_cf000a01_ck CHECK (width_mm > 0);
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_356ad3dc_ck CHECK (height_mm > 0);
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_41c9fdd5_ck CHECK (rotation_deg >= -180 AND rotation_deg < 180);
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_fc531714_ck CHECK (segment_start_ms IS NULL OR segment_start_ms >= 0);
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_998cbfc5_ck CHECK ((segment_start_ms IS NULL AND segment_end_ms IS NULL) OR (segment_start_ms IS NOT NULL AND segment_end_ms IS NOT NULL AND segment_end_ms - segment_start_ms = 3000));
ALTER TABLE personalization.design_reviews ADD CONSTRAINT personalization_design_reviews_7f883bf9_ck CHECK (review_type IN ('CUSTOMER_APPROVAL','MANAGER_REVIEW'));
ALTER TABLE personalization.design_reviews ADD CONSTRAINT personalization_design_reviews_e77cc52d_ck CHECK ((review_type='CUSTOMER_APPROVAL' AND decision='APPROVE') OR (review_type='MANAGER_REVIEW' AND decision IN ('APPROVE','REQUEST_CHANGES')));
ALTER TABLE personalization.design_reviews ADD CONSTRAINT personalization_design_reviews_0123c452_ck CHECK (decision <> 'REQUEST_CHANGES' OR (notes IS NOT NULL AND btrim(notes) <> ''));
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_e4953401_ck CHECK (jsonb_typeof(requested_changes_json)='object' AND requested_changes_json <> '{}'::jsonb);
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_3f696084_ck CHECK (reason IS NOT NULL AND btrim(reason) <> '');
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_79b405af_ck CHECK (status IN ('SUBMITTED','APPLIED','REJECTED'));
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_d343788c_ck CHECK ((status='APPLIED' AND created_version_id IS NOT NULL) OR (status<>'APPLIED' AND created_version_id IS NULL));
ALTER TABLE production.design_locks ADD CONSTRAINT production_design_locks_aaf643c0_ck CHECK (lock_version>=1);
ALTER TABLE production.design_locks ADD CONSTRAINT production_design_locks_a22d8394_ck CHECK (status IN ('ACTIVE','SUPERSEDED','VOID'));
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_961ea7ff_ck CHECK (max_safe_engraving_depth_mm>0);
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_5f0e6e96_ck CHECK (expected_engraving_depth_mm>=0 AND expected_engraving_depth_mm<=max_safe_engraving_depth_mm);
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_cfb95a25_ck CHECK (depth_tolerance_mm>=0);
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_4f4d0490_ck CHECK (package_version>=1);
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_6a8f451f_ck CHECK (status IN ('CURRENT','SUPERSEDED','VOID'));
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_33b7fab8_ck CHECK (power_pct>=0 AND power_pct<=100);
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_af57eab6_ck CHECK (speed_mm_s>0);
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_a0efc73c_ck CHECK (frequency_khz>0);
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_c7790bbf_ck CHECK (passes>=1);
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_820d4735_ck CHECK (expected_depth_mm>=0);
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_cfb95a25_ck CHECK (depth_tolerance_mm>=0);
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_ecdf4f68_ck CHECK (version_no>=1);
ALTER TABLE production.production_routes ADD CONSTRAINT production_production_routes_ecdf4f68_ck CHECK (version_no>=1);
ALTER TABLE production.production_routes ADD CONSTRAINT production_production_routes_85827548_ck CHECK (status IN ('DRAFT','ACTIVE','INACTIVE'));
ALTER TABLE production.jeweler_skills ADD CONSTRAINT production_jeweler_skills_d3ae640a_ck CHECK (level BETWEEN 1 AND 3);
ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_f0018f08_ck CHECK (attempt_no>=1);
ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_59ed3d5f_ck CHECK (attempt_type IN ('ORIGINAL','REMAKE','AFTER_SALES'));
ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_f11189f3_ck CHECK (status IN ('CREATED','IN_PROGRESS','AWAITING_QC','COMPLETED','FAILED','SCRAPPED','CANCELLED'));
ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_38049b2c_ck CHECK (status IN ('PLANNED','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'));
ALTER TABLE production.work_order_steps ADD CONSTRAINT production_work_order_steps_274e3b47_ck CHECK (sequence_no>=1);
ALTER TABLE production.work_order_steps ADD CONSTRAINT production_work_order_steps_1c5bb9d1_ck CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED','BLOCKED'));
ALTER TABLE production.work_order_assignments ADD CONSTRAINT production_work_order_assignments_04585f77_ck CHECK (status IN ('ACTIVE','ENDED'));
ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_111b20e9_ck CHECK (actual_passes IS NULL OR actual_passes>=0);
ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_939c2071_ck CHECK (measured_depth_mm IS NULL OR measured_depth_mm>=0);
ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_7309567c_ck CHECK (result IN ('SUCCESS','FAILED','ABORTED'));
ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_a45b7b8a_ck CHECK (status IN ('PENDING','APPROVED','REJECTED','RESOLVED'));
ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_61e46187_ck CHECK (qc_type IN ('FINAL','AFTER_SALES'));
ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_a8cdb5b0_ck CHECK (result IN ('PASS','FAIL'));
ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_ff27ab51_ck CHECK ((result='PASS' AND disposition IS NULL) OR (result='FAIL' AND disposition IN ('REWORK','REMAKE','SCRAP')));
ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_c3d973bd_ck CHECK (stock_type IN ('RING_BLANK','GEMSTONE'));
ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_29d51d09_ck CHECK (quantity_on_hand>=0);
ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_f929a3c6_ck CHECK (quantity_reserved>=0 AND quantity_reserved<=quantity_on_hand);
ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_453e168c_ck CHECK (unit_cost IS NULL OR unit_cost>=0);
ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_32cc14ef_ck CHECK (status IN ('ACTIVE','BLOCKED','INACTIVE'));
ALTER TABLE inventory.certified_gemstones ADD CONSTRAINT inventory_certified_gemstones_8b59aa7b_ck CHECK (purchase_cost IS NULL OR purchase_cost>=0);
ALTER TABLE inventory.certified_gemstones ADD CONSTRAINT inventory_certified_gemstones_b071cf5b_ck CHECK (status IN ('AVAILABLE','HOLD','RESERVED','ALLOCATED','USED','DAMAGED','SCRAPPED'));
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_b8377e04_ck CHECK (num_nonnulls(stock_lot_id, certified_gemstone_id)=1);
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_67f78d31_ck CHECK (quantity>0);
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_9e1eb3b3_ck CHECK (status IN ('HOLD','RESERVED','ALLOCATED','CONSUMED','RELEASED','EXPIRED'));
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_47975b8a_ck CHECK (movement_type IN ('RECEIVE','RESERVE','ALLOCATE','CONSUME','RELEASE','ADJUST','WRITE_OFF'));
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_b8377e04_ck CHECK (num_nonnulls(stock_lot_id, certified_gemstone_id)=1);
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_67f78d31_ck CHECK (quantity>0);
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_18174328_ck CHECK (unit_cost_snapshot IS NULL OR unit_cost_snapshot>=0);
ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_11a4549c_ck CHECK (handover_type IN ('SALE_PICKUP','SALE_DELIVERY','AFTER_SALES_RETURN'));
ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_77115555_ck CHECK (status IN ('CREATED','VERIFIED','EXPIRED','COMPLETED','CANCELLED'));
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_ec82a289_ck CHECK ((handover_scope='ORDER' AND ring_item_id IS NULL) OR (handover_scope='RING_ITEM' AND ring_item_id IS NOT NULL));
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_d3f78a4b_ck CHECK (handover_scope IN ('ORDER','RING_ITEM'));
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_f0018f08_ck CHECK (attempt_no>=1);
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_be7c9ef5_ck CHECK (accepted_at IS NULL OR (assigned_at IS NOT NULL AND accepted_at>=assigned_at));
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_cfa6f0ff_ck CHECK (status IN ('CREATED','ASSIGNED','ACCEPTED','READY_FOR_PICKUP','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RETURN_TO_STORE','RETURNED_TO_STORE','CANCELLED'));
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_2345df21_ck CHECK (adjustment_amount>=0);
ALTER TABLE memory.memory_cards ADD CONSTRAINT memory_memory_cards_a875f08b_ck CHECK (status IN ('PENDING','ACTIVE','DISABLED','DELETED'));
ALTER TABLE memory.memory_cards ADD CONSTRAINT memory_memory_cards_e5c0cf0c_ck CHECK (pin_failed_attempts>=0);
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_e7c67353_ck CHECK (content_type IN ('TEXT','IMAGE','AUDIO','VIDEO'));
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_cfdbf519_ck CHECK ((content_type='TEXT' AND text_content IS NOT NULL AND btrim(text_content)<>'') OR (content_type<>'TEXT' AND asset_key IS NOT NULL));
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_82de98d3_ck CHECK (sort_order>=0);
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_fa8d4372_ck CHECK (status IN ('ACTIVE','HIDDEN','DELETED'));
ALTER TABLE memory.access_grants ADD CONSTRAINT memory_access_grants_b06aab3c_ck CHECK (status IN ('PENDING','ACTIVE','REVOKED','EXPIRED'));
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_88f91cfe_ck CHECK (claim_type IN ('WARRANTY','MAINTENANCE','RETURN'));
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_ecc4fdde_ck CHECK (status IN ('DRAFT','SUBMITTED','TRIAGE_PENDING','INSPECTION_REQUIRED','DECISION_PENDING','RESOLUTION_IN_PROGRESS','READY_FOR_RETURN','CLOSED','REJECTED','CANCELLED'));
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_42cfe508_ck CHECK (maintenance_plan_id IS NULL OR claim_type='MAINTENANCE');
ALTER TABLE after_sales.claim_events ADD CONSTRAINT after_sales_claim_events_ba1f7f80_ck CHECK (event_type IN ('STATUS_CHANGED','MANAGER_DECISION','SLA_PAUSED','SLA_RESUMED','RESOLUTION'));
ALTER TABLE after_sales.maintenance_plans ADD CONSTRAINT after_sales_maintenance_plans_668f9c47_ck CHECK (ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at > starts_at));
ALTER TABLE after_sales.maintenance_plans ADD CONSTRAINT after_sales_maintenance_plans_b94aa803_ck CHECK (status<>'ACTIVE' OR (starts_at IS NOT NULL AND activated_at IS NOT NULL));
ALTER TABLE after_sales.maintenance_plans ADD CONSTRAINT after_sales_maintenance_plans_96cace4e_ck CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'));
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
ALTER TABLE pricing.price_items ADD CONSTRAINT pricing_price_items_66484632_ck CHECK (price_type IN ('RING_BLANK','GEMSTONE','CERTIFIED_GEMSTONE','PERSONALIZATION','SERVICE','MAINTENANCE_PLAN'));
ALTER TABLE pricing.price_items ADD CONSTRAINT pricing_price_items_e7c4c8d8_ck CHECK ((price_type='RING_BLANK' AND template_variant_id IS NOT NULL AND num_nonnulls(gemstone_option_id,certified_gemstone_id,personalization_package)=0) OR (price_type='GEMSTONE' AND gemstone_option_id IS NOT NULL AND num_nonnulls(template_variant_id,certified_gemstone_id,personalization_package)=0) OR (price_type='CERTIFIED_GEMSTONE' AND certified_gemstone_id IS NOT NULL AND num_nonnulls(template_variant_id,gemstone_option_id,personalization_package)=0) OR (price_type='PERSONALIZATION' AND personalization_package IN ('FINGERPRINT','SOUNDWAVE') AND num_nonnulls(template_variant_id,gemstone_option_id,certified_gemstone_id)=0) OR (price_type IN ('SERVICE','MAINTENANCE_PLAN') AND num_nonnulls(template_variant_id,gemstone_option_id,certified_gemstone_id,personalization_package)=0));
ALTER TABLE pricing.pricing_rules ADD CONSTRAINT pricing_pricing_rules_1147f6f0_ck CHECK (rule_type IN ('RESIZE_FEE','DELIVERY_FEE','CANCELLATION_FEE','REDELIVERY_FEE'));
ALTER TABLE pricing.pricing_rules ADD CONSTRAINT pricing_pricing_rules_300b90d0_ck CHECK ((rule_type='RESIZE_FEE' AND template_variant_id IS NOT NULL AND resize_direction IS NOT NULL AND num_nonnulls(delivery_zone_code,cancellation_stage,redelivery_reason)=0) OR (rule_type='DELIVERY_FEE' AND delivery_zone_code IS NOT NULL AND num_nonnulls(template_variant_id,resize_direction,cancellation_stage,redelivery_reason)=0) OR (rule_type='CANCELLATION_FEE' AND cancellation_stage IS NOT NULL AND num_nonnulls(template_variant_id,resize_direction,delivery_zone_code,redelivery_reason)=0) OR (rule_type='REDELIVERY_FEE' AND redelivery_reason IS NOT NULL AND num_nonnulls(template_variant_id,resize_direction,delivery_zone_code,cancellation_stage)=0));
ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_f71019a2_ck CHECK (personalization_package IN ('NONE','FINGERPRINT','SOUNDWAVE'));
ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_15279975_ck CHECK (personalization_package <> 'NONE' OR memory_enabled IS FALSE);
ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_57316834_ck CHECK (num_nonnulls(owner_user_id,guest_session_id)=1);
ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_f71019a2_ck CHECK (personalization_package IN ('NONE','FINGERPRINT','SOUNDWAVE'));
ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_15279975_ck CHECK (personalization_package <> 'NONE' OR memory_enabled IS FALSE);
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_64397b82_ck CHECK ((quote_type IN ('PROVISIONAL','FINAL') AND order_id IS NOT NULL AND claim_id IS NULL) OR (quote_type='SERVICE' AND claim_id IS NOT NULL));
ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_0e8c51b9_ck CHECK (price_source_type IN ('PRICE_VERSION','PRICING_RULE','MANUAL'));
ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_3d12f2b6_ck CHECK ((price_source_type='PRICE_VERSION' AND price_version_id IS NOT NULL AND pricing_rule_id IS NULL) OR (price_source_type='PRICING_RULE' AND pricing_rule_id IS NOT NULL AND price_version_id IS NULL) OR (price_source_type='MANUAL' AND price_version_id IS NULL AND pricing_rule_id IS NULL));
ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_298e7e7e_ck CHECK (component_type IN ('RING_BLANK','GEMSTONE','RESIZE','PERSONALIZATION','MAINTENANCE_PLAN','DELIVERY','ADJUSTMENT','SERVICE'));
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_8687e094_ck CHECK (payment_method='PAYOS' OR (payment_method='STORE_CASH' AND provider IS NULL AND recorded_by_user_id IS NOT NULL));
ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_063118cd_ck CHECK ((allocation_kind='RING_ITEM' AND ring_item_id IS NOT NULL) OR (allocation_kind='ORDER_FEE' AND ring_item_id IS NULL));
ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_bdf01fef_ck CHECK ((stock_type='RING_BLANK' AND template_variant_id IS NOT NULL AND gemstone_option_id IS NULL) OR (stock_type='GEMSTONE' AND gemstone_option_id IS NOT NULL AND template_variant_id IS NULL));
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_3af3c80f_ck CHECK (num_nonnulls(stock_lot_id,certified_gemstone_id)=1);
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_e8e77b1f_ck CHECK (certified_gemstone_id IS NULL OR quantity=1);
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_3af3c80f_ck CHECK (num_nonnulls(stock_lot_id,certified_gemstone_id)=1);
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_df94d19f_ck CHECK (handover_scope <> 'ORDER' OR handed_over_items_snapshot_json IS NOT NULL);
ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_2a93bdcb_ck CHECK (max_up_delta IS NULL OR max_up_delta>=0);
ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_41145f59_ck CHECK (max_down_delta IS NULL OR max_down_delta>=0);

-- ===== UNIQUE INDEXES (including partial/composite) =====
CREATE UNIQUE INDEX iam_users_email_7dbe4f3_uq ON iam.users (email);
CREATE UNIQUE INDEX iam_users_google_sub_7e11351_uq ON iam.users (google_sub);
CREATE UNIQUE INDEX iam_roles_code_6326a65_uq ON iam.roles (code);
CREATE UNIQUE INDEX iam_permissions_code_7674bec_uq ON iam.permissions (code);
CREATE UNIQUE INDEX catalog_ring_templates_code_76fd044_uq ON catalog.ring_templates (code);
CREATE UNIQUE INDEX catalog_materials_code_8afae07_uq ON catalog.materials (code);
CREATE UNIQUE INDEX catalog_template_variants_ring_template_id_material__18ec7ba4 ON catalog.template_variants (ring_template_id, material_id, standard_size);
CREATE UNIQUE INDEX catalog_gemstone_options_code_a88e79d_uq ON catalog.gemstone_options (code);
CREATE UNIQUE INDEX catalog_gemstone_groups_ring_template_id_code_78dc39c_uq ON catalog.gemstone_groups (ring_template_id, code);
CREATE UNIQUE INDEX catalog_gemstone_slots_gemstone_group_id_code_4f59516_uq ON catalog.gemstone_slots (gemstone_group_id, code);
CREATE UNIQUE INDEX catalog_gemstone_slots_gemstone_group_id_slot_index__151b8493 ON catalog.gemstone_slots (gemstone_group_id, slot_index);
CREATE UNIQUE INDEX catalog_template_compatibilities_template_variant_id_e8f87843 ON catalog.template_compatibilities (template_variant_id, gemstone_group_id, gemstone_option_id);
CREATE UNIQUE INDEX pricing_price_items_template_variant_id_0ab1af3_uq ON pricing.price_items (template_variant_id) WHERE price_type='RING_BLANK';
CREATE UNIQUE INDEX pricing_price_items_gemstone_option_id_1b6dcfc_uq ON pricing.price_items (gemstone_option_id) WHERE price_type='GEMSTONE';
CREATE UNIQUE INDEX pricing_price_items_certified_gemstone_id_82cf3ae_uq ON pricing.price_items (certified_gemstone_id) WHERE price_type='CERTIFIED_GEMSTONE';
CREATE UNIQUE INDEX pricing_price_items_personalization_package_5e5a3af_uq ON pricing.price_items (personalization_package) WHERE price_type='PERSONALIZATION';
CREATE UNIQUE INDEX pricing_price_items_code_0d92144_uq ON pricing.price_items (code);
CREATE UNIQUE INDEX pricing_price_versions_price_item_id_version_no_950b9f7_uq ON pricing.price_versions (price_item_id, version_no);
CREATE UNIQUE INDEX pricing_price_versions_price_item_id_e509871_uq ON pricing.price_versions (price_item_id) WHERE status='ACTIVE';
CREATE UNIQUE INDEX pricing_pricing_rules_rule_type_code_version_no_9d128bc_uq ON pricing.pricing_rules (rule_type, code, version_no);
CREATE UNIQUE INDEX pricing_pricing_rules_delivery_zone_code_b2eb027_uq ON pricing.pricing_rules (delivery_zone_code) WHERE rule_type='DELIVERY_FEE' AND status='ACTIVE';
CREATE UNIQUE INDEX pricing_pricing_rules_cancellation_stage_c0d3b8d_uq ON pricing.pricing_rules (cancellation_stage) WHERE rule_type='CANCELLATION_FEE' AND status='ACTIVE';
CREATE UNIQUE INDEX pricing_pricing_rules_redelivery_reason_c8088ef_uq ON pricing.pricing_rules (redelivery_reason) WHERE rule_type='REDELIVERY_FEE' AND status='ACTIVE';
CREATE UNIQUE INDEX design_design_codes_code_hash_c5cb430_uq ON design.design_codes (code_hash);
CREATE UNIQUE INDEX ordering_orders_order_no_8692349_uq ON ordering.orders (order_no);
CREATE UNIQUE INDEX ordering_orders_invoice_no_0f5b442_uq ON ordering.orders (invoice_no);
CREATE UNIQUE INDEX ordering_ring_items_order_id_item_no_3980e3f_uq ON ordering.ring_items (order_id, item_no);
CREATE UNIQUE INDEX ordering_ring_items_source_ring_design_draft_id_7434b1f_uq ON ordering.ring_items (source_ring_design_draft_id);
CREATE UNIQUE INDEX ordering_ring_item_versions_ring_item_id_version_no__903f3e22 ON ordering.ring_item_versions (ring_item_id, version_no);
CREATE UNIQUE INDEX ordering_quotes_quote_no_a037545_uq ON ordering.quotes (quote_no);
CREATE UNIQUE INDEX ordering_final_confirmations_order_id_eed441d_uq ON ordering.final_confirmations (order_id) WHERE status='ACTIVE';
CREATE UNIQUE INDEX ordering_final_confirmation_items_final_confirmation_785844bd ON ordering.final_confirmation_items (final_confirmation_id, ring_item_id);
CREATE UNIQUE INDEX ordering_payment_transactions_provider_provider_orde_85beb578 ON ordering.payment_transactions (provider, provider_order_code) WHERE provider_order_code IS NOT NULL;
CREATE UNIQUE INDEX ordering_payment_transactions_provider_provider_tran_de04a9cd ON ordering.payment_transactions (provider, provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX ordering_payment_transactions_receipt_no_1541fba_uq ON ordering.payment_transactions (receipt_no);
CREATE UNIQUE INDEX personalization_source_bindings_ring_item_id_f370ef8_uq ON personalization.source_bindings (ring_item_id) WHERE released_at IS NULL;
CREATE UNIQUE INDEX personalization_consent_ring_items_consent_id_ring_i_a805b4ff ON personalization.consent_ring_items (consent_id, ring_item_id);
CREATE UNIQUE INDEX personalization_capture_sessions_accepted_source_id__539c5a6e ON personalization.capture_sessions (accepted_source_id);
CREATE UNIQUE INDEX personalization_capture_attempts_capture_session_id__00d71a5e ON personalization.capture_attempts (capture_session_id, attempt_no);
CREATE UNIQUE INDEX personalization_capture_attempts_capture_session_id__3798e77c ON personalization.capture_attempts (capture_session_id) WHERE result='ACCEPTED';
CREATE UNIQUE INDEX personalization_personalization_placements_ring_item_df2a87d1 ON personalization.personalization_placements (ring_item_version_id);
CREATE UNIQUE INDEX personalization_change_requests_ring_item_id_78559ac_uq ON personalization.change_requests (ring_item_id) WHERE status='SUBMITTED';
CREATE UNIQUE INDEX production_design_locks_order_id_65ffebe_uq ON production.design_locks (order_id) WHERE status='ACTIVE';
CREATE UNIQUE INDEX production_design_locks_order_id_lock_version_0f2de67_uq ON production.design_locks (order_id, lock_version);
CREATE UNIQUE INDEX production_design_lock_items_design_lock_id_ring_ite_0547535e ON production.design_lock_items (design_lock_id, ring_item_id);
CREATE UNIQUE INDEX production_production_packages_package_no_bea8924_uq ON production.production_packages (package_no);
CREATE UNIQUE INDEX production_production_packages_design_lock_id_ring_i_d8d08399 ON production.production_packages (design_lock_id, ring_item_id, package_version);
CREATE UNIQUE INDEX production_laser_process_profiles_code_version_no_70_d8dd74f5 ON production.laser_process_profiles (code, version_no);
CREATE UNIQUE INDEX production_production_routes_ring_template_id_versio_f084fe6c ON production.production_routes (ring_template_id, version_no);
CREATE UNIQUE INDEX production_jeweler_skills_jeweler_user_id_skill_code_53c875a2 ON production.jeweler_skills (jeweler_user_id, skill_code);
CREATE UNIQUE INDEX production_production_attempts_ring_item_id_attempt__2c29531e ON production.production_attempts (ring_item_id, attempt_no);
CREATE UNIQUE INDEX production_work_orders_work_order_no_5976099_uq ON production.work_orders (work_order_no);
CREATE UNIQUE INDEX production_work_order_steps_work_order_id_sequence_n_f54ecc72 ON production.work_order_steps (work_order_id, sequence_no);
CREATE UNIQUE INDEX production_work_order_assignments_work_order_id_jewe_550fb12e ON production.work_order_assignments (work_order_id, jeweler_user_id) WHERE status='ACTIVE';
CREATE UNIQUE INDEX inventory_stock_lots_stock_code_c994f27_uq ON inventory.stock_lots (stock_code);
CREATE UNIQUE INDEX inventory_certified_gemstones_internal_code_b200882_uq ON inventory.certified_gemstones (internal_code);
CREATE UNIQUE INDEX inventory_certified_gemstones_certificate_provider_c_4247bcd7 ON inventory.certified_gemstones (certificate_provider, certificate_number);
CREATE UNIQUE INDEX fulfillment_handover_sessions_qr_nonce_72892fe_uq ON fulfillment.handover_sessions (qr_nonce);
CREATE UNIQUE INDEX fulfillment_handover_records_handover_session_id_8c4593c_uq ON fulfillment.handover_records (handover_session_id);
CREATE UNIQUE INDEX fulfillment_deliveries_order_id_attempt_no_8ada59f_uq ON fulfillment.deliveries (order_id, attempt_no) WHERE claim_id IS NULL;
CREATE UNIQUE INDEX fulfillment_deliveries_claim_id_attempt_no_f199aa5_uq ON fulfillment.deliveries (claim_id, attempt_no) WHERE claim_id IS NOT NULL;
CREATE UNIQUE INDEX memory_memory_cards_ring_item_id_13e03f7_uq ON memory.memory_cards (ring_item_id);
CREATE UNIQUE INDEX after_sales_claims_claim_no_2f99d15_uq ON after_sales.claims (claim_no);
CREATE UNIQUE INDEX platform_lightrag_knowledge_documents_document_key_v_a2b3d73f ON platform.lightrag_knowledge_documents (document_key, version_no);
CREATE UNIQUE INDEX platform_lightrag_knowledge_documents_lightrag_works_5f568d67 ON platform.lightrag_knowledge_documents (lightrag_workspace, lightrag_doc_id) WHERE lightrag_doc_id IS NOT NULL;
CREATE UNIQUE INDEX platform_share_links_token_hash_5ce3596_uq ON platform.share_links (token_hash);
CREATE UNIQUE INDEX platform_system_configurations_config_key_version_no_de4f45d1 ON platform.system_configurations (config_key, version_no);
CREATE UNIQUE INDEX platform_privacy_requests_request_no_8ef5662_uq ON platform.privacy_requests (request_no);
CREATE UNIQUE INDEX ordering_quotes_order_id_quote_type_version_no_77537b2_uq ON ordering.quotes (order_id, quote_type, version_no) WHERE claim_id IS NULL;
CREATE UNIQUE INDEX ordering_quotes_claim_id_quote_type_version_no_205d2c6_uq ON ordering.quotes (claim_id, quote_type, version_no) WHERE claim_id IS NOT NULL;
CREATE UNIQUE INDEX pricing_pricing_rules_template_variant_id_resize_dir_14cda999 ON pricing.pricing_rules (template_variant_id, resize_direction) WHERE rule_type='RESIZE_FEE' AND status='ACTIVE';

-- ===== ALL 225 FOREIGN KEYS: ALTER AFTER TABLES TO SUPPORT CYCLIC REFERENCES =====
ALTER TABLE iam.users ADD CONSTRAINT iam_users_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE iam.customer_identities ADD CONSTRAINT iam_customer_identities_user_id_fk FOREIGN KEY (user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE iam.user_roles ADD CONSTRAINT iam_user_roles_user_id_fk FOREIGN KEY (user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE iam.user_roles ADD CONSTRAINT iam_user_roles_role_id_fk FOREIGN KEY (role_id) REFERENCES iam.roles (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE iam.user_roles ADD CONSTRAINT iam_user_roles_assigned_by_user_id_fk FOREIGN KEY (assigned_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE iam.role_permissions ADD CONSTRAINT iam_role_permissions_role_id_fk FOREIGN KEY (role_id) REFERENCES iam.roles (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE iam.role_permissions ADD CONSTRAINT iam_role_permissions_permission_id_fk FOREIGN KEY (permission_id) REFERENCES iam.permissions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE iam.role_permissions ADD CONSTRAINT iam_role_permissions_granted_by_user_id_fk FOREIGN KEY (granted_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.ring_templates ADD CONSTRAINT catalog_ring_templates_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_ring_template_id_fk FOREIGN KEY (ring_template_id) REFERENCES catalog.ring_templates (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_material_id_fk FOREIGN KEY (material_id) REFERENCES catalog.materials (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.gemstone_groups ADD CONSTRAINT catalog_gemstone_groups_ring_template_id_fk FOREIGN KEY (ring_template_id) REFERENCES catalog.ring_templates (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.gemstone_slots ADD CONSTRAINT catalog_gemstone_slots_gemstone_group_id_fk FOREIGN KEY (gemstone_group_id) REFERENCES catalog.gemstone_groups (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.template_compatibilities ADD CONSTRAINT catalog_template_compatibilities_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.template_compatibilities ADD CONSTRAINT catalog_template_compatibilities_gemstone_group_id_fk FOREIGN KEY (gemstone_group_id) REFERENCES catalog.gemstone_groups (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE catalog.template_compatibilities ADD CONSTRAINT catalog_template_compatibilities_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.price_items ADD CONSTRAINT pricing_price_items_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.price_items ADD CONSTRAINT pricing_price_items_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.price_items ADD CONSTRAINT pricing_price_items_certified_gemstone_id_fk FOREIGN KEY (certified_gemstone_id) REFERENCES inventory.certified_gemstones (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.price_versions ADD CONSTRAINT pricing_price_versions_price_item_id_fk FOREIGN KEY (price_item_id) REFERENCES pricing.price_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.price_versions ADD CONSTRAINT pricing_price_versions_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.price_versions ADD CONSTRAINT pricing_price_versions_reviewed_by_user_id_fk FOREIGN KEY (reviewed_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.pricing_rules ADD CONSTRAINT pricing_pricing_rules_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.pricing_rules ADD CONSTRAINT pricing_pricing_rules_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE pricing.pricing_rules ADD CONSTRAINT pricing_pricing_rules_approved_by_user_id_fk FOREIGN KEY (approved_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE design.carts ADD CONSTRAINT design_carts_user_id_fk FOREIGN KEY (user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_cart_id_fk FOREIGN KEY (cart_id) REFERENCES design.carts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_owner_user_id_fk FOREIGN KEY (owner_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE design.design_codes ADD CONSTRAINT design_design_codes_ring_design_draft_id_fk FOREIGN KEY (ring_design_draft_id) REFERENCES design.ring_design_drafts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE design.design_codes ADD CONSTRAINT design_design_codes_redeemed_into_draft_id_fk FOREIGN KEY (redeemed_into_draft_id) REFERENCES design.ring_design_drafts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.orders ADD CONSTRAINT ordering_orders_owner_customer_identity_id_fk FOREIGN KEY (owner_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.orders ADD CONSTRAINT ordering_orders_created_from_cart_id_fk FOREIGN KEY (created_from_cart_id) REFERENCES design.carts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.orders ADD CONSTRAINT ordering_orders_current_quote_id_fk FOREIGN KEY (current_quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_items ADD CONSTRAINT ordering_ring_items_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_items ADD CONSTRAINT ordering_ring_items_source_ring_design_draft_id_fk FOREIGN KEY (source_ring_design_draft_id) REFERENCES design.ring_design_drafts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_items ADD CONSTRAINT ordering_ring_items_current_version_id_fk FOREIGN KEY (current_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_parent_version_id_fk FOREIGN KEY (parent_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_created_by_customer_iden_71f1223b FOREIGN KEY (created_by_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_item_version_gemstones ADD CONSTRAINT ordering_ring_item_version_gemstones_ring_item_versi_c478276e FOREIGN KEY (ring_item_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_item_version_gemstones ADD CONSTRAINT ordering_ring_item_version_gemstones_gemstone_slot_id_fk FOREIGN KEY (gemstone_slot_id) REFERENCES catalog.gemstone_slots (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.ring_item_version_gemstones ADD CONSTRAINT ordering_ring_item_version_gemstones_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_supersedes_quote_id_fk FOREIGN KEY (supersedes_quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_accepted_by_customer_identity_id_fk FOREIGN KEY (accepted_by_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_quote_id_fk FOREIGN KEY (quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_price_version_id_fk FOREIGN KEY (price_version_id) REFERENCES pricing.price_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_pricing_rule_id_fk FOREIGN KEY (pricing_rule_id) REFERENCES pricing.pricing_rules (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.final_confirmations ADD CONSTRAINT ordering_final_confirmations_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.final_confirmations ADD CONSTRAINT ordering_final_confirmations_quote_id_fk FOREIGN KEY (quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.final_confirmations ADD CONSTRAINT ordering_final_confirmations_confirmed_by_customer_i_811f752d FOREIGN KEY (confirmed_by_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.final_confirmation_items ADD CONSTRAINT ordering_final_confirmation_items_final_confirmation_id_fk FOREIGN KEY (final_confirmation_id) REFERENCES ordering.final_confirmations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.final_confirmation_items ADD CONSTRAINT ordering_final_confirmation_items_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.final_confirmation_items ADD CONSTRAINT ordering_final_confirmation_items_ring_item_version_id_fk FOREIGN KEY (ring_item_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_quote_id_fk FOREIGN KEY (quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_recorded_by_user_id_fk FOREIGN KEY (recorded_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_related_transaction_id_fk FOREIGN KEY (related_transaction_id) REFERENCES ordering.payment_transactions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_payment_transaction_id_fk FOREIGN KEY (payment_transaction_id) REFERENCES ordering.payment_transactions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_original_allocation_id_fk FOREIGN KEY (original_allocation_id) REFERENCES ordering.payment_item_allocations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.personalization_sources ADD CONSTRAINT personalization_personalization_sources_owner_custom_46612666 FOREIGN KEY (owner_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.personalization_sources ADD CONSTRAINT personalization_personalization_sources_captured_or__788a5f71 FOREIGN KEY (captured_or_uploaded_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.source_bindings ADD CONSTRAINT personalization_source_bindings_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.source_bindings ADD CONSTRAINT personalization_source_bindings_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.source_bindings ADD CONSTRAINT personalization_source_bindings_personalization_sour_b635a8e4 FOREIGN KEY (personalization_source_id) REFERENCES personalization.personalization_sources (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.consents ADD CONSTRAINT personalization_consents_customer_identity_id_fk FOREIGN KEY (customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.consents ADD CONSTRAINT personalization_consents_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.consents ADD CONSTRAINT personalization_consents_personalization_source_id_fk FOREIGN KEY (personalization_source_id) REFERENCES personalization.personalization_sources (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.consent_ring_items ADD CONSTRAINT personalization_consent_ring_items_consent_id_fk FOREIGN KEY (consent_id) REFERENCES personalization.consents (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.consent_ring_items ADD CONSTRAINT personalization_consent_ring_items_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_consent_id_fk FOREIGN KEY (consent_id) REFERENCES personalization.consents (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_staff_user_id_fk FOREIGN KEY (staff_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_accepted_source_id_fk FOREIGN KEY (accepted_source_id) REFERENCES personalization.personalization_sources (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.capture_attempts ADD CONSTRAINT personalization_capture_attempts_capture_session_id_fk FOREIGN KEY (capture_session_id) REFERENCES personalization.capture_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_ring_item_473b3270 FOREIGN KEY (ring_item_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_personali_ae9c9ed7 FOREIGN KEY (personalization_source_id) REFERENCES personalization.personalization_sources (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_created_b_23d7cb6f FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_created_b_9cc0ed7d FOREIGN KEY (created_by_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.design_reviews ADD CONSTRAINT personalization_design_reviews_ring_item_version_id_fk FOREIGN KEY (ring_item_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.design_reviews ADD CONSTRAINT personalization_design_reviews_actor_user_id_fk FOREIGN KEY (actor_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.design_reviews ADD CONSTRAINT personalization_design_reviews_actor_customer_identi_2fbec482 FOREIGN KEY (actor_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_from_version_id_fk FOREIGN KEY (from_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_requested_by_custome_38a74099 FOREIGN KEY (requested_by_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_reviewed_by_user_id_fk FOREIGN KEY (reviewed_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE personalization.change_requests ADD CONSTRAINT personalization_change_requests_created_version_id_fk FOREIGN KEY (created_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.design_locks ADD CONSTRAINT production_design_locks_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.design_locks ADD CONSTRAINT production_design_locks_final_confirmation_id_fk FOREIGN KEY (final_confirmation_id) REFERENCES ordering.final_confirmations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.design_locks ADD CONSTRAINT production_design_locks_locked_by_user_id_fk FOREIGN KEY (locked_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.design_lock_items ADD CONSTRAINT production_design_lock_items_design_lock_id_fk FOREIGN KEY (design_lock_id) REFERENCES production.design_locks (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.design_lock_items ADD CONSTRAINT production_design_lock_items_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.design_lock_items ADD CONSTRAINT production_design_lock_items_ring_item_version_id_fk FOREIGN KEY (ring_item_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_design_lock_id_fk FOREIGN KEY (design_lock_id) REFERENCES production.design_locks (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_ring_item_version_id_fk FOREIGN KEY (ring_item_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_laser_process_profile_id_fk FOREIGN KEY (laser_process_profile_id) REFERENCES production.laser_process_profiles (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_generated_by_user_id_fk FOREIGN KEY (generated_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_supersedes_package_id_fk FOREIGN KEY (supersedes_package_id) REFERENCES production.production_packages (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_material_id_fk FOREIGN KEY (material_id) REFERENCES catalog.materials (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.laser_process_profiles ADD CONSTRAINT production_laser_process_profiles_approved_by_user_id_fk FOREIGN KEY (approved_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_routes ADD CONSTRAINT production_production_routes_ring_template_id_fk FOREIGN KEY (ring_template_id) REFERENCES catalog.ring_templates (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_routes ADD CONSTRAINT production_production_routes_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_routes ADD CONSTRAINT production_production_routes_approved_by_user_id_fk FOREIGN KEY (approved_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.jeweler_skills ADD CONSTRAINT production_jeweler_skills_jeweler_user_id_fk FOREIGN KEY (jeweler_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.jeweler_skills ADD CONSTRAINT production_jeweler_skills_verified_by_user_id_fk FOREIGN KEY (verified_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_parent_attempt_id_fk FOREIGN KEY (parent_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_production_attempt_id_fk FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_production_package_id_fk FOREIGN KEY (production_package_id) REFERENCES production.production_packages (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_production_route_id_fk FOREIGN KEY (production_route_id) REFERENCES production.production_routes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_order_steps ADD CONSTRAINT production_work_order_steps_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_order_steps ADD CONSTRAINT production_work_order_steps_performed_by_user_id_fk FOREIGN KEY (performed_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_order_assignments ADD CONSTRAINT production_work_order_assignments_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_order_assignments ADD CONSTRAINT production_work_order_assignments_jeweler_user_id_fk FOREIGN KEY (jeweler_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_order_assignments ADD CONSTRAINT production_work_order_assignments_assigned_by_user_id_fk FOREIGN KEY (assigned_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.work_order_assignments ADD CONSTRAINT production_work_order_assignments_unassigned_by_user_id_fk FOREIGN KEY (unassigned_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_work_order_step_id_fk FOREIGN KEY (work_order_step_id) REFERENCES production.work_order_steps (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_production_package_id_fk FOREIGN KEY (production_package_id) REFERENCES production.production_packages (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_operator_user_id_fk FOREIGN KEY (operator_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_laser_process_profile_id_fk FOREIGN KEY (laser_process_profile_id) REFERENCES production.laser_process_profiles (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_work_order_step_id_fk FOREIGN KEY (work_order_step_id) REFERENCES production.work_order_steps (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_production_attempt_id_fk FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_requested_by_user_id_fk FOREIGN KEY (requested_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_reviewed_by_user_id_fk FOREIGN KEY (reviewed_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_production_attempt_id_fk FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_reviewer_user_id_fk FOREIGN KEY (reviewer_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.certified_gemstones ADD CONSTRAINT inventory_certified_gemstones_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_production_attempt_id_fk FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_stock_lot_id_fk FOREIGN KEY (stock_lot_id) REFERENCES inventory.stock_lots (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_certified_gemstone_id_fk FOREIGN KEY (certified_gemstone_id) REFERENCES inventory.certified_gemstones (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_allocated_by_user_id_fk FOREIGN KEY (allocated_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_stock_lot_id_fk FOREIGN KEY (stock_lot_id) REFERENCES inventory.stock_lots (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_certified_gemstone_id_fk FOREIGN KEY (certified_gemstone_id) REFERENCES inventory.certified_gemstones (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_allocation_id_fk FOREIGN KEY (allocation_id) REFERENCES inventory.allocations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_production_attempt_id_fk FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_performed_by_user_id_fk FOREIGN KEY (performed_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_verified_by_user_id_fk FOREIGN KEY (verified_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_override_approved_by_u_8aad398f FOREIGN KEY (override_approved_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_handover_session_id_fk FOREIGN KEY (handover_session_id) REFERENCES fulfillment.handover_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_handover_actor_user_id_fk FOREIGN KEY (handover_actor_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_evidence_asset_id_fk FOREIGN KEY (evidence_asset_id) REFERENCES platform.evidence_assets (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_parent_delivery_id_fk FOREIGN KEY (parent_delivery_id) REFERENCES fulfillment.deliveries (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_assigned_delivery_staff_id_fk FOREIGN KEY (assigned_delivery_staff_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_assigned_by_user_id_fk FOREIGN KEY (assigned_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_handover_session_id_fk FOREIGN KEY (handover_session_id) REFERENCES fulfillment.handover_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_handover_record_id_fk FOREIGN KEY (handover_record_id) REFERENCES fulfillment.handover_records (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE memory.memory_cards ADD CONSTRAINT memory_memory_cards_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE memory.memory_cards ADD CONSTRAINT memory_memory_cards_owner_customer_identity_id_fk FOREIGN KEY (owner_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_memory_card_id_fk FOREIGN KEY (memory_card_id) REFERENCES memory.memory_cards (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE memory.memory_contents ADD CONSTRAINT memory_memory_contents_created_by_customer_identity_id_fk FOREIGN KEY (created_by_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE memory.access_grants ADD CONSTRAINT memory_access_grants_memory_card_id_fk FOREIGN KEY (memory_card_id) REFERENCES memory.memory_cards (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE memory.access_grants ADD CONSTRAINT memory_access_grants_grantee_user_id_fk FOREIGN KEY (grantee_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE memory.access_grants ADD CONSTRAINT memory_access_grants_revoked_by_user_id_fk FOREIGN KEY (revoked_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_requester_customer_identity_id_fk FOREIGN KEY (requester_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_assigned_manager_id_fk FOREIGN KEY (assigned_manager_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_maintenance_plan_id_fk FOREIGN KEY (maintenance_plan_id) REFERENCES after_sales.maintenance_plans (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_created_by_customer_identity_id_fk FOREIGN KEY (created_by_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claim_events ADD CONSTRAINT after_sales_claim_events_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claim_events ADD CONSTRAINT after_sales_claim_events_actor_user_id_fk FOREIGN KEY (actor_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.claim_events ADD CONSTRAINT after_sales_claim_events_actor_customer_identity_id_fk FOREIGN KEY (actor_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.maintenance_plans ADD CONSTRAINT after_sales_maintenance_plans_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.maintenance_plans ADD CONSTRAINT after_sales_maintenance_plans_purchased_quote_item_id_fk FOREIGN KEY (purchased_quote_item_id) REFERENCES ordering.quote_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_production_attem_e208e314 FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_evidence_asset_id_fk FOREIGN KEY (evidence_asset_id) REFERENCES platform.evidence_assets (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_performed_by_user_id_fk FOREIGN KEY (performed_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_received_by_user_id_fk FOREIGN KEY (received_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.lightrag_knowledge_documents ADD CONSTRAINT platform_lightrag_knowledge_documents_supersedes_doc_2a6e2e80 FOREIGN KEY (supersedes_document_id) REFERENCES platform.lightrag_knowledge_documents (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.lightrag_knowledge_documents ADD CONSTRAINT platform_lightrag_knowledge_documents_uploaded_by_us_ff58a5de FOREIGN KEY (uploaded_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.lightrag_knowledge_documents ADD CONSTRAINT platform_lightrag_knowledge_documents_reviewed_by_us_799a2147 FOREIGN KEY (reviewed_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.ai_conversations ADD CONSTRAINT platform_ai_conversations_user_id_fk FOREIGN KEY (user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.ai_messages ADD CONSTRAINT platform_ai_messages_conversation_id_fk FOREIGN KEY (conversation_id) REFERENCES platform.ai_conversations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.evidence_assets ADD CONSTRAINT platform_evidence_assets_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.evidence_assets ADD CONSTRAINT platform_evidence_assets_created_by_customer_identity_id_fk FOREIGN KEY (created_by_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.notifications ADD CONSTRAINT platform_notifications_recipient_user_id_fk FOREIGN KEY (recipient_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.notifications ADD CONSTRAINT platform_notifications_recipient_customer_identity_id_fk FOREIGN KEY (recipient_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.audit_logs ADD CONSTRAINT platform_audit_logs_actor_user_id_fk FOREIGN KEY (actor_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.audit_logs ADD CONSTRAINT platform_audit_logs_actor_customer_identity_id_fk FOREIGN KEY (actor_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.share_links ADD CONSTRAINT platform_share_links_created_by_user_id_fk FOREIGN KEY (created_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.share_links ADD CONSTRAINT platform_share_links_ring_template_id_fk FOREIGN KEY (ring_template_id) REFERENCES catalog.ring_templates (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.share_links ADD CONSTRAINT platform_share_links_ring_design_draft_id_fk FOREIGN KEY (ring_design_draft_id) REFERENCES design.ring_design_drafts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.system_configurations ADD CONSTRAINT platform_system_configurations_updated_by_user_id_fk FOREIGN KEY (updated_by_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.privacy_requests ADD CONSTRAINT platform_privacy_requests_requester_customer_identity_id_fk FOREIGN KEY (requester_customer_identity_id) REFERENCES iam.customer_identities (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE platform.privacy_requests ADD CONSTRAINT platform_privacy_requests_assigned_admin_user_id_fk FOREIGN KEY (assigned_admin_user_id) REFERENCES iam.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

COMMIT;
