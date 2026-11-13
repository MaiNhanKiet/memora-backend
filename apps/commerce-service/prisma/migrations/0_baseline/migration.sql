-- commerce-service baseline: BM04 schema from db/MEMORA_BM04_PostgreSQL_74_tables.sql.
-- Same-service objects only. Cross-service foreign keys are not created (see db/MEMORA_BM04_Drop_Cross_Service_FKs.sql).
-- Already present on existing databases: mark as applied with `prisma migrate resolve --applied 0_baseline`.

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

CREATE SCHEMA IF NOT EXISTS catalog;

CREATE SCHEMA IF NOT EXISTS pricing;

CREATE SCHEMA IF NOT EXISTS design;

CREATE SCHEMA IF NOT EXISTS ordering;

CREATE SCHEMA IF NOT EXISTS inventory;

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

CREATE TABLE catalog.gemstone_slots (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    gemstone_group_id UUID NOT NULL,
    code VARCHAR(60) NOT NULL,
    slot_index SMALLINT NOT NULL,
    glb_node_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalog.template_compatibilities (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    template_variant_id UUID NOT NULL,
    gemstone_group_id UUID NOT NULL,
    gemstone_option_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE design.carts (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    guest_session_id VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE ordering.orders (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_no VARCHAR(40) NOT NULL,
    owner_customer_identity_id UUID NOT NULL,
    guest_email public.citext,
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
    recipient_email public.citext,
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

CREATE TABLE ordering.ring_item_version_gemstones (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    ring_item_version_id UUID NOT NULL,
    gemstone_slot_id UUID NOT NULL,
    gemstone_option_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE ordering.final_confirmation_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    final_confirmation_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    ring_item_version_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_2a93bdcb_ck CHECK (max_up_delta IS NULL OR max_up_delta>=0);

ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_41145f59_ck CHECK (max_down_delta IS NULL OR max_down_delta>=0);

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

CREATE UNIQUE INDEX inventory_stock_lots_stock_code_c994f27_uq ON inventory.stock_lots (stock_code);

CREATE UNIQUE INDEX inventory_certified_gemstones_internal_code_b200882_uq ON inventory.certified_gemstones (internal_code);

CREATE UNIQUE INDEX inventory_certified_gemstones_certificate_provider_c_4247bcd7 ON inventory.certified_gemstones (certificate_provider, certificate_number);

CREATE UNIQUE INDEX ordering_quotes_order_id_quote_type_version_no_77537b2_uq ON ordering.quotes (order_id, quote_type, version_no) WHERE claim_id IS NULL;

CREATE UNIQUE INDEX ordering_quotes_claim_id_quote_type_version_no_205d2c6_uq ON ordering.quotes (claim_id, quote_type, version_no) WHERE claim_id IS NOT NULL;

CREATE UNIQUE INDEX pricing_pricing_rules_template_variant_id_resize_dir_14cda999 ON pricing.pricing_rules (template_variant_id, resize_direction) WHERE rule_type='RESIZE_FEE' AND status='ACTIVE';

ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_ring_template_id_fk FOREIGN KEY (ring_template_id) REFERENCES catalog.ring_templates (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE catalog.template_variants ADD CONSTRAINT catalog_template_variants_material_id_fk FOREIGN KEY (material_id) REFERENCES catalog.materials (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE catalog.gemstone_groups ADD CONSTRAINT catalog_gemstone_groups_ring_template_id_fk FOREIGN KEY (ring_template_id) REFERENCES catalog.ring_templates (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE catalog.gemstone_slots ADD CONSTRAINT catalog_gemstone_slots_gemstone_group_id_fk FOREIGN KEY (gemstone_group_id) REFERENCES catalog.gemstone_groups (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE catalog.template_compatibilities ADD CONSTRAINT catalog_template_compatibilities_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE catalog.template_compatibilities ADD CONSTRAINT catalog_template_compatibilities_gemstone_group_id_fk FOREIGN KEY (gemstone_group_id) REFERENCES catalog.gemstone_groups (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE catalog.template_compatibilities ADD CONSTRAINT catalog_template_compatibilities_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE pricing.price_items ADD CONSTRAINT pricing_price_items_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE pricing.price_items ADD CONSTRAINT pricing_price_items_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE pricing.price_items ADD CONSTRAINT pricing_price_items_certified_gemstone_id_fk FOREIGN KEY (certified_gemstone_id) REFERENCES inventory.certified_gemstones (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE pricing.price_versions ADD CONSTRAINT pricing_price_versions_price_item_id_fk FOREIGN KEY (price_item_id) REFERENCES pricing.price_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE pricing.pricing_rules ADD CONSTRAINT pricing_pricing_rules_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_cart_id_fk FOREIGN KEY (cart_id) REFERENCES design.carts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE design.ring_design_drafts ADD CONSTRAINT design_ring_design_drafts_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE design.design_codes ADD CONSTRAINT design_design_codes_ring_design_draft_id_fk FOREIGN KEY (ring_design_draft_id) REFERENCES design.ring_design_drafts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE design.design_codes ADD CONSTRAINT design_design_codes_redeemed_into_draft_id_fk FOREIGN KEY (redeemed_into_draft_id) REFERENCES design.ring_design_drafts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.orders ADD CONSTRAINT ordering_orders_created_from_cart_id_fk FOREIGN KEY (created_from_cart_id) REFERENCES design.carts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.orders ADD CONSTRAINT ordering_orders_current_quote_id_fk FOREIGN KEY (current_quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_items ADD CONSTRAINT ordering_ring_items_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_items ADD CONSTRAINT ordering_ring_items_source_ring_design_draft_id_fk FOREIGN KEY (source_ring_design_draft_id) REFERENCES design.ring_design_drafts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_items ADD CONSTRAINT ordering_ring_items_current_version_id_fk FOREIGN KEY (current_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_parent_version_id_fk FOREIGN KEY (parent_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_item_versions ADD CONSTRAINT ordering_ring_item_versions_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_item_version_gemstones ADD CONSTRAINT ordering_ring_item_version_gemstones_ring_item_versi_c478276e FOREIGN KEY (ring_item_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_item_version_gemstones ADD CONSTRAINT ordering_ring_item_version_gemstones_gemstone_slot_id_fk FOREIGN KEY (gemstone_slot_id) REFERENCES catalog.gemstone_slots (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.ring_item_version_gemstones ADD CONSTRAINT ordering_ring_item_version_gemstones_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.quotes ADD CONSTRAINT ordering_quotes_supersedes_quote_id_fk FOREIGN KEY (supersedes_quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_quote_id_fk FOREIGN KEY (quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_price_version_id_fk FOREIGN KEY (price_version_id) REFERENCES pricing.price_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.quote_items ADD CONSTRAINT ordering_quote_items_pricing_rule_id_fk FOREIGN KEY (pricing_rule_id) REFERENCES pricing.pricing_rules (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.final_confirmations ADD CONSTRAINT ordering_final_confirmations_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.final_confirmations ADD CONSTRAINT ordering_final_confirmations_quote_id_fk FOREIGN KEY (quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.final_confirmation_items ADD CONSTRAINT ordering_final_confirmation_items_final_confirmation_id_fk FOREIGN KEY (final_confirmation_id) REFERENCES ordering.final_confirmations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.final_confirmation_items ADD CONSTRAINT ordering_final_confirmation_items_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.final_confirmation_items ADD CONSTRAINT ordering_final_confirmation_items_ring_item_version_id_fk FOREIGN KEY (ring_item_version_id) REFERENCES ordering.ring_item_versions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_order_id_fk FOREIGN KEY (order_id) REFERENCES ordering.orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_quote_id_fk FOREIGN KEY (quote_id) REFERENCES ordering.quotes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.payment_transactions ADD CONSTRAINT ordering_payment_transactions_related_transaction_id_fk FOREIGN KEY (related_transaction_id) REFERENCES ordering.payment_transactions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_payment_transaction_id_fk FOREIGN KEY (payment_transaction_id) REFERENCES ordering.payment_transactions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ordering.payment_item_allocations ADD CONSTRAINT ordering_payment_item_allocations_original_allocation_id_fk FOREIGN KEY (original_allocation_id) REFERENCES ordering.payment_item_allocations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_template_variant_id_fk FOREIGN KEY (template_variant_id) REFERENCES catalog.template_variants (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.stock_lots ADD CONSTRAINT inventory_stock_lots_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.certified_gemstones ADD CONSTRAINT inventory_certified_gemstones_gemstone_option_id_fk FOREIGN KEY (gemstone_option_id) REFERENCES catalog.gemstone_options (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_stock_lot_id_fk FOREIGN KEY (stock_lot_id) REFERENCES inventory.stock_lots (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.allocations ADD CONSTRAINT inventory_allocations_certified_gemstone_id_fk FOREIGN KEY (certified_gemstone_id) REFERENCES inventory.certified_gemstones (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_stock_lot_id_fk FOREIGN KEY (stock_lot_id) REFERENCES inventory.stock_lots (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_certified_gemstone_id_fk FOREIGN KEY (certified_gemstone_id) REFERENCES inventory.certified_gemstones (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_allocation_id_fk FOREIGN KEY (allocation_id) REFERENCES inventory.allocations (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE inventory.inventory_movements ADD CONSTRAINT inventory_inventory_movements_ring_item_id_fk FOREIGN KEY (ring_item_id) REFERENCES ordering.ring_items (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
