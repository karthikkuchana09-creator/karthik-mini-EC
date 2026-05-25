-- ============================================================
-- Seed data for mini_ec_db
-- Run this AFTER the FastAPI backend has created the tables
-- Usage: In Workbench, select mini_ec_db and run this script
-- ============================================================

-- 1. Default organization
INSERT INTO organizations (name, slug, subscription_plan, is_active)
VALUES ('Main Organization', 'main-org', 'enterprise', 1)
ON DUPLICATE KEY UPDATE name=name;

SET @org_id = (SELECT id FROM organizations WHERE slug = 'main-org');

-- 2. Default org settings
INSERT INTO organization_settings (organization_id, max_users, max_storage_gb)
VALUES (@org_id, 1000, 100)
ON DUPLICATE KEY UPDATE organization_id=organization_id;

-- 3. Usage credits
INSERT INTO usage_credits (organization_id, total_credits, used_credits, remaining_credits)
VALUES (@org_id, 10000, 0, 10000)
ON DUPLICATE KEY UPDATE organization_id=organization_id;

-- 4. Subscription plans
INSERT INTO subscription_plans (tier, name, description, price_monthly, price_yearly,
    max_users, max_tasks, max_ai_queries, max_storage_mb, max_teams,
    has_analytics, has_approvals, has_ai_intelligence, has_realtime_collaboration,
    has_advanced_analytics, has_api_access, has_audit_trail, has_custom_branding,
    has_priority_support, has_sla, sort_order, is_active)
VALUES
    ('basic', 'Basic', 'Essential features for small teams getting started',
     0, 0, 5, 100, 50, 100, 1,
     1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1),
    ('silver', 'Silver', 'Advanced features for growing businesses',
     2900, 29000, 25, 1000, 500, 500, 5,
     1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 2, 1),
    ('gold', 'Gold', 'Unlimited access with AI intelligence and realtime collaboration',
     9900, 99000, 100, 10000, 5000, 2000, 20,
     1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1)
ON DUPLICATE KEY UPDATE name=name;

-- 5. Tenant subscription (Gold/yearly for main org)
INSERT INTO tenant_subscriptions (
    organization_id, plan_id, status, billing_interval,
    current_period_end, auto_renew, is_active
)
SELECT @org_id, id, 'active', 'yearly',
       DATE_ADD(NOW(), INTERVAL 1 YEAR), 1, 1
FROM subscription_plans
WHERE tier = 'gold'
ON DUPLICATE KEY UPDATE organization_id=organization_id;

SELECT 'Seed complete' AS status;
