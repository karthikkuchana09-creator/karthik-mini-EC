-- ============================================================
-- Enterprise Multi-Tenant Schema for karthik-mini-EC
-- Run this in MySQL Workbench against mini_ec_db
-- ============================================================

-- 1. ORGANIZATIONS TABLE (core tenant entity)
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo VARCHAR(500) DEFAULT NULL,
    subscription_plan ENUM('free', 'starter', 'business', 'enterprise') DEFAULT 'free',
    is_active TINYINT(1) DEFAULT 1,
    metadata_json TEXT DEFAULT NULL,
    suspended_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organizations_slug (slug),
    INDEX idx_organizations_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. ORGANIZATION SETTINGS TABLE (branding, config per tenant)
CREATE TABLE IF NOT EXISTS organization_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL UNIQUE,
    primary_color VARCHAR(7) DEFAULT '#6366f1',
    secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
    logo_url VARCHAR(500) DEFAULT NULL,
    favicon_url VARCHAR(500) DEFAULT NULL,
    company_address TEXT DEFAULT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    max_users INT DEFAULT 50,
    max_storage_gb INT DEFAULT 5,
    allowed_auth_providers JSON DEFAULT ('["email"]'),
    feature_flags JSON DEFAULT ('{}'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. ADD tenant_id TO EXISTING TABLES
-- Users
ALTER TABLE users
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD COLUMN subscription_role ENUM('owner', 'admin', 'member', 'guest') DEFAULT 'member' AFTER role,
    ADD INDEX idx_users_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Tasks
ALTER TABLE tasks
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_tasks_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Approvals
ALTER TABLE approvals
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_approvals_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Approval History
ALTER TABLE approval_history
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_approval_history_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Comments
ALTER TABLE comments
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_comments_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Documents
ALTER TABLE documents
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_documents_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Leaves
ALTER TABLE leaves
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_leaves_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Notifications
ALTER TABLE notifications
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_notifications_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Audit Logs
ALTER TABLE audit_logs
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_audit_logs_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- AI Analyses
ALTER TABLE ai_analyses
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_ai_analyses_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Refresh Tokens
ALTER TABLE refresh_tokens
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_refresh_tokens_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Password Reset Tokens
ALTER TABLE password_reset_tokens
    ADD COLUMN tenant_id INT DEFAULT NULL AFTER id,
    ADD INDEX idx_password_reset_tokens_tenant_id (tenant_id),
    ADD FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- 4. CREATE TENANT INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS organization_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
    token VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
    invited_by INT DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invitations_token (token),
    INDEX idx_invitations_email (email),
    INDEX idx_invitations_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. CREATE DEFAULT ORGANIZATION AND MIGRATE EXISTING DATA
-- Create a default "Main Organization" for existing unaffiliated records
INSERT INTO organizations (name, slug, subscription_plan, is_active)
VALUES ('Main Organization', 'main-org', 'enterprise', 1)
ON DUPLICATE KEY UPDATE name=name;

-- Get the default org ID
SET @default_org_id = (SELECT id FROM organizations WHERE slug = 'main-org');

-- Create default settings for the default org
INSERT INTO organization_settings (organization_id, max_users, max_storage_gb)
VALUES (@default_org_id, 1000, 100)
ON DUPLICATE KEY UPDATE organization_id=organization_id;

-- Update existing unaffiliated records to belong to the default org
UPDATE users SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE approvals SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE approval_history SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE comments SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE documents SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE leaves SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE notifications SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE audit_logs SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE ai_analyses SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE refresh_tokens SET tenant_id = @default_org_id WHERE tenant_id IS NULL;
UPDATE password_reset_tokens SET tenant_id = @default_org_id WHERE tenant_id IS NULL;

-- ============================================================
-- 6. SUBSCRIPTION MANAGEMENT TABLES
-- ============================================================

-- Subscription Plans (plan definitions with feature flags)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tier ENUM('basic', 'silver', 'gold') NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    price_monthly INT DEFAULT 0,
    price_yearly INT DEFAULT 0,
    max_users INT DEFAULT 5,
    max_tasks INT DEFAULT 100,
    max_ai_queries INT DEFAULT 50,
    max_storage_mb INT DEFAULT 100,
    max_teams INT DEFAULT 1,
    has_analytics TINYINT(1) DEFAULT 0,
    has_approvals TINYINT(1) DEFAULT 0,
    has_ai_intelligence TINYINT(1) DEFAULT 0,
    has_realtime_collaboration TINYINT(1) DEFAULT 0,
    has_advanced_analytics TINYINT(1) DEFAULT 0,
    has_api_access TINYINT(1) DEFAULT 0,
    has_audit_trail TINYINT(1) DEFAULT 0,
    has_custom_branding TINYINT(1) DEFAULT 0,
    has_priority_support TINYINT(1) DEFAULT 0,
    has_sla TINYINT(1) DEFAULT 0,
    features_json JSON DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_plans_tier (tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tenant Subscriptions (tracks each org's active subscription)
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    plan_id INT NOT NULL,
    status ENUM('active', 'trialing', 'past_due', 'canceled', 'expired') DEFAULT 'active',
    billing_interval ENUM('monthly', 'yearly') DEFAULT 'monthly',
    start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_end DATETIME NOT NULL,
    trial_end DATETIME DEFAULT NULL,
    canceled_at DATETIME DEFAULT NULL,
    ended_at DATETIME DEFAULT NULL,
    auto_renew TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    metadata_json TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    INDEX idx_subscriptions_org (organization_id),
    INDEX idx_subscriptions_plan (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Billing History (audit trail for all subscription changes)
CREATE TABLE IF NOT EXISTS billing_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    subscription_id INT DEFAULT NULL,
    event_type VARCHAR(50) NOT NULL,
    description TEXT DEFAULT NULL,
    previous_plan_id INT DEFAULT NULL,
    new_plan_id INT DEFAULT NULL,
    previous_status VARCHAR(50) DEFAULT NULL,
    new_status VARCHAR(50) DEFAULT NULL,
    amount INT DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    interval VARCHAR(20) DEFAULT NULL,
    period_start DATETIME DEFAULT NULL,
    period_end DATETIME DEFAULT NULL,
    invoice_url VARCHAR(500) DEFAULT NULL,
    receipt_url VARCHAR(500) DEFAULT NULL,
    payment_method VARCHAR(50) DEFAULT NULL,
    metadata_json TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
    INDEX idx_billing_org (organization_id),
    INDEX idx_billing_event (event_type),
    INDEX idx_billing_sub (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default plans
INSERT INTO subscription_plans (tier, name, description, price_monthly, price_yearly,
    max_users, max_tasks, max_ai_queries, max_storage_mb, max_teams,
    has_analytics, has_approvals, has_ai_intelligence, has_realtime_collaboration,
    has_advanced_analytics, has_api_access, has_audit_trail, has_custom_branding,
    has_priority_support, has_sla, sort_order, is_active)
VALUES
    ('basic', 'Basic', 'Essential features for small teams getting started',
     0, 0, 5, 100, 50, 100, 1,
     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1),
    ('silver', 'Silver', 'Advanced features for growing businesses',
     2900, 29000, 25, 1000, 500, 500, 5,
     1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 2, 1),
    ('gold', 'Gold', 'Unlimited access with AI intelligence and realtime collaboration',
     9900, 99000, 100, 10000, 5000, 2000, 20,
     1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1)
ON DUPLICATE KEY UPDATE name=name;

-- ============================================================
-- 7. CREDIT-BASED USAGE SYSTEM
-- ============================================================

-- Usage Credits (per-organization credit balance)
CREATE TABLE IF NOT EXISTS usage_credits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL UNIQUE,
    total_credits INT NOT NULL DEFAULT 100,
    used_credits INT NOT NULL DEFAULT 0,
    remaining_credits INT NOT NULL DEFAULT 100,
    low_credit_threshold INT DEFAULT 20,
    low_credit_alert_sent TINYINT(1) DEFAULT 0,
    last_reset_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_usage_credits_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Credit Transactions (audit trail for every credit movement)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credit_id INT NOT NULL,
    organization_id INT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'deduction',
    feature VARCHAR(100) NOT NULL,
    credits_used INT NOT NULL,
    balance_before INT NOT NULL,
    balance_after INT NOT NULL,
    description TEXT DEFAULT NULL,
    reference_type VARCHAR(50) DEFAULT NULL,
    reference_id INT DEFAULT NULL,
    metadata_json TEXT DEFAULT NULL,
    user_id INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credit_id) REFERENCES usage_credits(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_credit_tx_credit (credit_id),
    INDEX idx_credit_tx_org (organization_id),
    INDEX idx_credit_tx_feature (feature),
    INDEX idx_credit_tx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
