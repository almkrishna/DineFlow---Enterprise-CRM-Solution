-- ============================================================================
-- DineFlow — CRM & Operations Analytics Query Library (SQLite)
-- ----------------------------------------------------------------------------
-- The reporting queries behind the DineFlow dashboards, usable directly
-- against restaurant_crm.db for ad-hoc analysis, BI tools, or exports.
-- Timestamps are stored in UTC — date/hour bucketing converts via 'localtime'.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. REVENUE OVERVIEW
-- ----------------------------------------------------------------------------

-- Total revenue, order count, and average order value (completed orders only)
SELECT
    COUNT(*)                            AS completed_orders,
    ROUND(SUM(grand_total), 2)          AS total_revenue,
    ROUND(AVG(grand_total), 2)          AS avg_order_value
FROM orders
WHERE status = 'completed';

-- Daily revenue and order volume, last 30 days
SELECT
    DATE(created_at, 'localtime')       AS business_date,
    COUNT(*)                            AS orders,
    ROUND(SUM(grand_total), 2)          AS revenue
FROM orders
WHERE status = 'completed'
  AND created_at >= DATETIME('now', '-30 days')
GROUP BY business_date
ORDER BY business_date;

-- Revenue by hour of day (staffing / peak-hour planning), last 30 days
SELECT
    CAST(STRFTIME('%H', created_at, 'localtime') AS INTEGER) AS hour_of_day,
    COUNT(*)                            AS orders,
    ROUND(SUM(grand_total), 2)          AS revenue
FROM orders
WHERE status = 'completed'
  AND created_at >= DATETIME('now', '-30 days')
GROUP BY hour_of_day
ORDER BY hour_of_day;


-- ----------------------------------------------------------------------------
-- 2. MENU PERFORMANCE
-- ----------------------------------------------------------------------------

-- Top-selling items by quantity, with revenue contribution
SELECT
    mi.name                             AS item,
    c.name                              AS category,
    mi.is_veg                           AS is_veg,
    SUM(oi.quantity)                    AS units_sold,
    ROUND(SUM(oi.subtotal), 2)          AS revenue
FROM order_items oi
JOIN orders   o  ON o.id = oi.order_id AND o.status = 'completed'
JOIN menu_items mi ON mi.id = oi.item_id
JOIN categories c  ON c.id = mi.category_id
GROUP BY mi.id
ORDER BY units_sold DESC
LIMIT 10;

-- Category revenue mix
SELECT
    c.name                              AS category,
    ROUND(SUM(oi.subtotal), 2)          AS revenue,
    ROUND(100.0 * SUM(oi.subtotal) /
          (SELECT SUM(oi2.subtotal)
           FROM order_items oi2
           JOIN orders o2 ON o2.id = oi2.order_id AND o2.status = 'completed'), 1
    )                                   AS revenue_share_pct
FROM order_items oi
JOIN orders o      ON o.id = oi.order_id AND o.status = 'completed'
JOIN menu_items mi ON mi.id = oi.item_id
JOIN categories c  ON c.id = mi.category_id
GROUP BY c.id
ORDER BY revenue DESC;

-- Veg vs non-veg demand split
SELECT
    CASE mi.is_veg WHEN 1 THEN 'veg' ELSE 'non-veg' END AS food_type,
    SUM(oi.quantity)                    AS units_sold,
    ROUND(SUM(oi.subtotal), 2)          AS revenue
FROM order_items oi
JOIN orders o      ON o.id = oi.order_id AND o.status = 'completed'
JOIN menu_items mi ON mi.id = oi.item_id
GROUP BY food_type;


-- ----------------------------------------------------------------------------
-- 3. KITCHEN OPERATIONS (status-transition timestamps)
-- ----------------------------------------------------------------------------

-- Prep time distribution: placed -> completed, in minutes
SELECT
    ROUND(AVG((JULIANDAY(completed_at) - JULIANDAY(created_at)) * 1440), 1) AS avg_prep_min,
    ROUND(MIN((JULIANDAY(completed_at) - JULIANDAY(created_at)) * 1440), 1) AS fastest_min,
    ROUND(MAX((JULIANDAY(completed_at) - JULIANDAY(created_at)) * 1440), 1) AS slowest_min
FROM orders
WHERE status = 'completed' AND completed_at IS NOT NULL;

-- Where kitchen time goes: average minutes per stage
SELECT
    ROUND(AVG((JULIANDAY(preparing_at) - JULIANDAY(created_at))  * 1440), 1) AS accept_min,
    ROUND(AVG((JULIANDAY(ready_at)     - JULIANDAY(preparing_at)) * 1440), 1) AS cooking_min,
    ROUND(AVG((JULIANDAY(completed_at) - JULIANDAY(ready_at))     * 1440), 1) AS serving_min
FROM orders
WHERE status = 'completed'
  AND preparing_at IS NOT NULL AND ready_at IS NOT NULL AND completed_at IS NOT NULL;

-- Daily average prep time trend, last 14 days
SELECT
    DATE(created_at, 'localtime')       AS business_date,
    COUNT(*)                            AS orders,
    ROUND(AVG((JULIANDAY(completed_at) - JULIANDAY(created_at)) * 1440), 1) AS avg_prep_min
FROM orders
WHERE status = 'completed' AND completed_at IS NOT NULL
  AND created_at >= DATETIME('now', '-14 days')
GROUP BY business_date
ORDER BY business_date;

-- Multi-round dining: how often tables order again on the same bill
SELECT
    MAX(oi.round_number)                AS rounds,
    COUNT(DISTINCT o.id)                AS orders
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY o.id
ORDER BY rounds DESC;


-- ----------------------------------------------------------------------------
-- 4. CANCELLATIONS
-- ----------------------------------------------------------------------------

-- Cancellation rate and lost revenue, last 30 days
SELECT
    SUM(status = 'cancelled')                                   AS cancelled,
    COUNT(*)                                                    AS total_orders,
    ROUND(100.0 * SUM(status = 'cancelled') / COUNT(*), 1)      AS cancel_rate_pct,
    ROUND(SUM(CASE WHEN status = 'cancelled' THEN grand_total END), 2) AS lost_revenue
FROM orders
WHERE created_at >= DATETIME('now', '-30 days');

-- Cancellation reasons breakdown
SELECT
    COALESCE(cancel_reason, 'No reason given') AS reason,
    COUNT(*)                                   AS occurrences
FROM orders
WHERE status = 'cancelled'
GROUP BY reason
ORDER BY occurrences DESC;


-- ----------------------------------------------------------------------------
-- 5. CRM: RFM SEGMENTATION & CUSTOMER VALUE
-- ----------------------------------------------------------------------------

-- RFM base metrics per customer, derived straight from orders
-- (Recency in days, Frequency as order count, Monetary as lifetime spend)
SELECT
    c.id,
    c.name,
    c.phone,
    CAST(JULIANDAY('now') - JULIANDAY(MAX(o.created_at)) AS INTEGER) AS recency_days,
    COUNT(o.id)                          AS frequency,
    ROUND(SUM(o.grand_total), 2)         AS monetary
FROM customers c
JOIN orders o ON o.customer_id = c.id AND o.status != 'cancelled'
GROUP BY c.id
ORDER BY monetary DESC;

-- Segment distribution (segments assigned by the RFM engine)
SELECT
    segment,
    COUNT(*)                             AS customers,
    ROUND(SUM(total_spent), 2)           AS lifetime_value,
    ROUND(AVG(total_spent), 2)           AS avg_value_per_customer
FROM customers
WHERE segment IS NOT NULL
GROUP BY segment
ORDER BY lifetime_value DESC;

-- Revenue at risk: lifetime value sitting in churn-risk segments
SELECT
    ROUND(SUM(total_spent), 2)           AS revenue_at_risk,
    COUNT(*)                             AS customers_at_risk
FROM customers
WHERE segment IN ('at_risk', 'cant_lose');

-- Repeat rate and new-customer acquisition (last 30 days)
SELECT
    ROUND(100.0 * SUM(total_orders >= 2) / COUNT(*), 1)  AS repeat_rate_pct,
    SUM(first_order_date >= DATETIME('now', '-30 days')) AS new_customers_30d,
    SUM(last_order_date  >= DATETIME('now', '-30 days')) AS active_customers_30d
FROM customers
WHERE total_orders > 0;

-- Top spenders with their favourite item
SELECT
    c.name,
    c.phone,
    c.segment,
    c.total_orders,
    ROUND(c.total_spent, 2)              AS lifetime_spend,
    (SELECT mi.name
     FROM order_items oi
     JOIN orders o2    ON o2.id = oi.order_id AND o2.customer_id = c.id
     JOIN menu_items mi ON mi.id = oi.item_id
     GROUP BY mi.id
     ORDER BY SUM(oi.quantity) DESC
     LIMIT 1)                            AS favourite_item
FROM customers c
WHERE c.total_orders > 0
ORDER BY c.total_spent DESC
LIMIT 10;

-- Campaign targeting lists: reachable customers per segment
SELECT
    cam.title                            AS campaign,
    cam.segment_target                   AS target_segment,
    cam.channel,
    COUNT(c.id)                          AS reachable_customers
FROM campaigns cam
LEFT JOIN customers c ON c.segment = cam.segment_target
GROUP BY cam.id
ORDER BY reachable_customers DESC;
