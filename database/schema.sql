-- DineFlow database schema (SQLite)
-- Generated from the live database. Tables are created/migrated automatically
-- by the backend on startup; this file documents the schema for analysts.

-- table: add_ons
CREATE TABLE add_ons (
	id INTEGER NOT NULL, 
	item_id INTEGER, 
	name VARCHAR(100) NOT NULL, 
	price NUMERIC(10, 2) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (id)
);

-- table: campaigns
CREATE TABLE campaigns (
	id INTEGER NOT NULL, 
	segment_target VARCHAR(30) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	message_template TEXT NOT NULL, 
	channel VARCHAR(20) NOT NULL, 
	discount_percent INTEGER, 
	status VARCHAR(20), 
	estimated_reach INTEGER, 
	created_at DATETIME, 
	PRIMARY KEY (id)
);

-- table: categories
CREATE TABLE categories (
	id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	display_order INTEGER, 
	created_at DATETIME, 
	PRIMARY KEY (id)
);

-- table: customers
CREATE TABLE customers (
	id INTEGER NOT NULL, 
	phone VARCHAR(15) NOT NULL, 
	name VARCHAR(100), 
	total_orders INTEGER, 
	total_spent NUMERIC(12, 2), 
	last_order_date DATETIME, 
	first_order_date DATETIME, 
	rfm_recency INTEGER, 
	rfm_frequency INTEGER, 
	rfm_monetary INTEGER, 
	rfm_score INTEGER, 
	segment VARCHAR(30), 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (phone)
);

-- table: menu_items
CREATE TABLE menu_items (
	id INTEGER NOT NULL, 
	category_id INTEGER, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	base_price NUMERIC(10, 2) NOT NULL, 
	image_url VARCHAR(500), 
	is_available BOOLEAN, 
	created_at DATETIME, is_veg BOOLEAN DEFAULT 1, 
	PRIMARY KEY (id), 
	FOREIGN KEY(category_id) REFERENCES categories (id)
);

-- table: order_items
CREATE TABLE order_items (
	id INTEGER NOT NULL, 
	order_id INTEGER, 
	item_id INTEGER, 
	variant_id INTEGER, 
	quantity INTEGER NOT NULL, 
	unit_price NUMERIC(10, 2) NOT NULL, 
	subtotal NUMERIC(10, 2) NOT NULL, 
	add_on_ids JSON, 
	add_on_names JSON, 
	add_on_total NUMERIC(10, 2), round_number INTEGER DEFAULT 1, 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES orders (id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (id), 
	FOREIGN KEY(variant_id) REFERENCES variants (id)
);

-- table: orders
CREATE TABLE orders (
	id INTEGER NOT NULL, 
	table_number INTEGER NOT NULL, 
	customer_id INTEGER, 
	status VARCHAR(20), 
	total_amount NUMERIC(10, 2), 
	tax_amount NUMERIC(10, 2), 
	grand_total NUMERIC(10, 2), 
	payment_status VARCHAR(20), 
	razorpay_order_id VARCHAR(100), 
	razorpay_payment_id VARCHAR(100), 
	created_at DATETIME, 
	updated_at DATETIME, payment_method VARCHAR(20), cancel_reason VARCHAR(255), preparing_at DATETIME, ready_at DATETIME, completed_at DATETIME, cancelled_at DATETIME, bill_printed BOOLEAN DEFAULT 0, 
	PRIMARY KEY (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id)
);

-- table: variants
CREATE TABLE variants (
	id INTEGER NOT NULL, 
	item_id INTEGER, 
	name VARCHAR(100) NOT NULL, 
	price NUMERIC(10, 2) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (id)
);

-- index: ix_add_ons_id
CREATE INDEX ix_add_ons_id ON add_ons (id);

-- index: ix_campaigns_id
CREATE INDEX ix_campaigns_id ON campaigns (id);

-- index: ix_categories_id
CREATE INDEX ix_categories_id ON categories (id);

-- index: ix_customers_id
CREATE INDEX ix_customers_id ON customers (id);

-- index: ix_menu_items_id
CREATE INDEX ix_menu_items_id ON menu_items (id);

-- index: ix_order_items_id
CREATE INDEX ix_order_items_id ON order_items (id);

-- index: ix_orders_id
CREATE INDEX ix_orders_id ON orders (id);

-- index: ix_variants_id
CREATE INDEX ix_variants_id ON variants (id);
