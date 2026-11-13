-- operations-service baseline: BM04 schema from db/MEMORA_BM04_PostgreSQL_74_tables.sql.
-- Same-service objects only. Cross-service foreign keys are not created (see db/MEMORA_BM04_Drop_Cross_Service_FKs.sql).
-- Already present on existing databases: mark as applied with `prisma migrate resolve --applied 0_baseline`.

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

CREATE SCHEMA IF NOT EXISTS personalization;

CREATE SCHEMA IF NOT EXISTS production;

CREATE SCHEMA IF NOT EXISTS fulfillment;

CREATE SCHEMA IF NOT EXISTS after_sales;

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

CREATE TABLE personalization.source_bindings (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    personalization_source_id UUID NOT NULL,
    binding_mode VARCHAR(15) NOT NULL,
    bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at TIMESTAMPTZ
);

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

CREATE TABLE personalization.consent_ring_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    consent_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE production.design_lock_items (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    design_lock_id UUID NOT NULL,
    ring_item_id UUID NOT NULL,
    ring_item_version_id UUID NOT NULL,
    item_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE fulfillment.handover_sessions (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    claim_id UUID,
    handover_type VARCHAR(25) NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_email public.citext,
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
    recipient_email public.citext,
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

ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_11a4549c_ck CHECK (handover_type IN ('SALE_PICKUP','SALE_DELIVERY','AFTER_SALES_RETURN'));

ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_77115555_ck CHECK (status IN ('CREATED','VERIFIED','EXPIRED','COMPLETED','CANCELLED'));

ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_ec82a289_ck CHECK ((handover_scope='ORDER' AND ring_item_id IS NULL) OR (handover_scope='RING_ITEM' AND ring_item_id IS NOT NULL));

ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_d3f78a4b_ck CHECK (handover_scope IN ('ORDER','RING_ITEM'));

ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_f0018f08_ck CHECK (attempt_no>=1);

ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_be7c9ef5_ck CHECK (accepted_at IS NULL OR (assigned_at IS NOT NULL AND accepted_at>=assigned_at));

ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_cfa6f0ff_ck CHECK (status IN ('CREATED','ASSIGNED','ACCEPTED','READY_FOR_PICKUP','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RETURN_TO_STORE','RETURNED_TO_STORE','CANCELLED'));

ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_2345df21_ck CHECK (adjustment_amount>=0);

ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_88f91cfe_ck CHECK (claim_type IN ('WARRANTY','MAINTENANCE','RETURN'));

ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_ecc4fdde_ck CHECK (status IN ('DRAFT','SUBMITTED','TRIAGE_PENDING','INSPECTION_REQUIRED','DECISION_PENDING','RESOLUTION_IN_PROGRESS','READY_FOR_RETURN','CLOSED','REJECTED','CANCELLED'));

ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_42cfe508_ck CHECK (maintenance_plan_id IS NULL OR claim_type='MAINTENANCE');

ALTER TABLE after_sales.claim_events ADD CONSTRAINT after_sales_claim_events_ba1f7f80_ck CHECK (event_type IN ('STATUS_CHANGED','MANAGER_DECISION','SLA_PAUSED','SLA_RESUMED','RESOLUTION'));

ALTER TABLE after_sales.maintenance_plans ADD CONSTRAINT after_sales_maintenance_plans_668f9c47_ck CHECK (ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at > starts_at));

ALTER TABLE after_sales.maintenance_plans ADD CONSTRAINT after_sales_maintenance_plans_b94aa803_ck CHECK (status<>'ACTIVE' OR (starts_at IS NOT NULL AND activated_at IS NOT NULL));

ALTER TABLE after_sales.maintenance_plans ADD CONSTRAINT after_sales_maintenance_plans_96cace4e_ck CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'));

ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_df94d19f_ck CHECK (handover_scope <> 'ORDER' OR handed_over_items_snapshot_json IS NOT NULL);

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

CREATE UNIQUE INDEX fulfillment_handover_sessions_qr_nonce_72892fe_uq ON fulfillment.handover_sessions (qr_nonce);

CREATE UNIQUE INDEX fulfillment_handover_records_handover_session_id_8c4593c_uq ON fulfillment.handover_records (handover_session_id);

CREATE UNIQUE INDEX fulfillment_deliveries_order_id_attempt_no_8ada59f_uq ON fulfillment.deliveries (order_id, attempt_no) WHERE claim_id IS NULL;

CREATE UNIQUE INDEX fulfillment_deliveries_claim_id_attempt_no_f199aa5_uq ON fulfillment.deliveries (claim_id, attempt_no) WHERE claim_id IS NOT NULL;

CREATE UNIQUE INDEX after_sales_claims_claim_no_2f99d15_uq ON after_sales.claims (claim_no);

ALTER TABLE personalization.source_bindings ADD CONSTRAINT personalization_source_bindings_personalization_sour_b635a8e4 FOREIGN KEY (personalization_source_id) REFERENCES personalization.personalization_sources (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE personalization.consents ADD CONSTRAINT personalization_consents_personalization_source_id_fk FOREIGN KEY (personalization_source_id) REFERENCES personalization.personalization_sources (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE personalization.consent_ring_items ADD CONSTRAINT personalization_consent_ring_items_consent_id_fk FOREIGN KEY (consent_id) REFERENCES personalization.consents (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_consent_id_fk FOREIGN KEY (consent_id) REFERENCES personalization.consents (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE personalization.capture_sessions ADD CONSTRAINT personalization_capture_sessions_accepted_source_id_fk FOREIGN KEY (accepted_source_id) REFERENCES personalization.personalization_sources (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE personalization.capture_attempts ADD CONSTRAINT personalization_capture_attempts_capture_session_id_fk FOREIGN KEY (capture_session_id) REFERENCES personalization.capture_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE personalization.personalization_placements ADD CONSTRAINT personalization_personalization_placements_personali_ae9c9ed7 FOREIGN KEY (personalization_source_id) REFERENCES personalization.personalization_sources (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.design_lock_items ADD CONSTRAINT production_design_lock_items_design_lock_id_fk FOREIGN KEY (design_lock_id) REFERENCES production.design_locks (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_design_lock_id_fk FOREIGN KEY (design_lock_id) REFERENCES production.design_locks (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_laser_process_profile_id_fk FOREIGN KEY (laser_process_profile_id) REFERENCES production.laser_process_profiles (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.production_packages ADD CONSTRAINT production_production_packages_supersedes_package_id_fk FOREIGN KEY (supersedes_package_id) REFERENCES production.production_packages (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.production_attempts ADD CONSTRAINT production_production_attempts_parent_attempt_id_fk FOREIGN KEY (parent_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_production_attempt_id_fk FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_production_package_id_fk FOREIGN KEY (production_package_id) REFERENCES production.production_packages (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.work_orders ADD CONSTRAINT production_work_orders_production_route_id_fk FOREIGN KEY (production_route_id) REFERENCES production.production_routes (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.work_order_steps ADD CONSTRAINT production_work_order_steps_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.work_order_assignments ADD CONSTRAINT production_work_order_assignments_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_work_order_step_id_fk FOREIGN KEY (work_order_step_id) REFERENCES production.work_order_steps (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_production_package_id_fk FOREIGN KEY (production_package_id) REFERENCES production.production_packages (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.laser_executions ADD CONSTRAINT production_laser_executions_laser_process_profile_id_fk FOREIGN KEY (laser_process_profile_id) REFERENCES production.laser_process_profiles (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_work_order_step_id_fk FOREIGN KEY (work_order_step_id) REFERENCES production.work_order_steps (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.production_exceptions ADD CONSTRAINT production_production_exceptions_production_attempt_id_fk FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_production_attempt_id_fk FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE production.qc_results ADD CONSTRAINT production_qc_results_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE fulfillment.handover_sessions ADD CONSTRAINT fulfillment_handover_sessions_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_handover_session_id_fk FOREIGN KEY (handover_session_id) REFERENCES fulfillment.handover_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE fulfillment.handover_records ADD CONSTRAINT fulfillment_handover_records_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_parent_delivery_id_fk FOREIGN KEY (parent_delivery_id) REFERENCES fulfillment.deliveries (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_handover_session_id_fk FOREIGN KEY (handover_session_id) REFERENCES fulfillment.handover_sessions (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE fulfillment.deliveries ADD CONSTRAINT fulfillment_deliveries_handover_record_id_fk FOREIGN KEY (handover_record_id) REFERENCES fulfillment.handover_records (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE after_sales.claims ADD CONSTRAINT after_sales_claims_maintenance_plan_id_fk FOREIGN KEY (maintenance_plan_id) REFERENCES after_sales.maintenance_plans (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE after_sales.claim_events ADD CONSTRAINT after_sales_claim_events_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_claim_id_fk FOREIGN KEY (claim_id) REFERENCES after_sales.claims (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_work_order_id_fk FOREIGN KEY (work_order_id) REFERENCES production.work_orders (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE after_sales.chain_of_custody_events ADD CONSTRAINT after_sales_chain_of_custody_events_production_attem_e208e314 FOREIGN KEY (production_attempt_id) REFERENCES production.production_attempts (id) ON UPDATE RESTRICT ON DELETE RESTRICT;
