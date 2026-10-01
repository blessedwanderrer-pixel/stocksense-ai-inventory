-- StockSense development-only seed data.
--
-- Idempotency:
--   * A complete existing seed is validated and left unchanged.
--   * A partial seed aborts instead of guessing, deleting, or duplicating data.
--
-- Stock integrity:
--   * Products are created with the schema default of zero stock.
--   * Every unit is added/removed through public.stock_movements so the
--     existing ledger trigger remains authoritative.

begin;

do $seed$
declare
  seed_user_id uuid;
  existing_seed_products integer;
begin
  perform pg_advisory_xact_lock(hashtext('stocksense-development-seed-v1'));

  select count(*)
  into existing_seed_products
  from public.products
  where sku = any (array[
    'GRO-RICE-5KG', 'GRO-OIL-1L', 'GRO-CEREAL-500G',
    'CLO-TSHIRT-COT', 'CLO-JEANS-SLIM', 'CLO-SHOES-RUN', 'CLO-HOODIE-WIN',
    'ELEC-TYPEC-1M', 'ELEC-MOUSE-WL', 'ELEC-HUB-USB', 'ELEC-PBANK-10K',
    'HOU-DISH-750', 'HOU-TOWEL-MF', 'HOU-LED-12W', 'HOU-STORAGE-20L'
  ]);

  if existing_seed_products = 15 then
    if exists (
      select 1
      from public.products
      where (sku = 'ELEC-TYPEC-1M' and current_stock <> 15)
         or (sku = 'ELEC-MOUSE-WL' and current_stock <> 25)
         or (sku = 'CLO-TSHIRT-COT' and current_stock <> 30)
         or (sku = 'GRO-RICE-5KG' and current_stock <> 5)
    ) then
      raise exception 'StockSense development seed exists but required test stock has changed; no data was modified';
    end if;
    raise notice 'StockSense development seed already exists; no data was modified';
    return;
  elsif existing_seed_products > 0 then
    raise exception 'Partial StockSense development seed detected (% of 15 products); no data was modified', existing_seed_products;
  end if;

  select id
  into seed_user_id
  from public.profiles
  where role = 'manager'
  order by created_at, id
  limit 1;

  if seed_user_id is null then
    raise exception 'A Manager profile is required to attribute development seed movements';
  end if;

  -- The stock trigger derives performed_by from auth.uid(). This transaction-
  -- local claim attributes the ledger to the existing Manager without storing
  -- credentials or changing any account/profile.
  perform set_config('request.jwt.claim.sub', seed_user_id::text, true);

  insert into public.categories (name)
  values ('Grocery'), ('Clothing'), ('Electronics'), ('Household')
  on conflict (name) do nothing;

  insert into public.suppliers (name, contact_name, email, phone)
  select seed.name, seed.contact_name, seed.email, seed.phone
  from (values
    ('Ali Traders', 'Ali Raza', 'orders@alitraders.example', '+92-300-555-0101'),
    ('FreshMart Distribution', 'Sara Ahmed', 'supply@freshmart.example', '+92-300-555-0102'),
    ('Metro Textiles', 'Usman Khan', 'wholesale@metrotextiles.example', '+92-300-555-0103'),
    ('HomeCare Wholesale', 'Ayesha Malik', 'sales@homecare.example', '+92-300-555-0104')
  ) as seed(name, contact_name, email, phone)
  where not exists (
    select 1 from public.suppliers existing where existing.name = seed.name
  );

  insert into public.products (
    category_id, sku, name, description, low_stock_threshold, selling_price
  )
  select category.id, seed.sku, seed.name, seed.description,
         seed.low_stock_threshold, seed.selling_price
  from (values
    ('Grocery', 'GRO-RICE-5KG', 'Premium Basmati Rice 5kg', 'Long-grain basmati rice family pack.', 10::bigint, 2199.00::numeric),
    ('Grocery', 'GRO-OIL-1L', 'Sunflower Cooking Oil 1L', 'Refined sunflower cooking oil.', 12::bigint, 699.00::numeric),
    ('Grocery', 'GRO-CEREAL-500G', 'Honey Breakfast Cereal 500g', 'Whole-grain honey breakfast cereal.', 8::bigint, 849.00::numeric),
    ('Clothing', 'CLO-TSHIRT-COT', 'Cotton T-Shirt', 'Unisex premium cotton crew-neck T-shirt.', 10::bigint, 1499.00::numeric),
    ('Clothing', 'CLO-JEANS-SLIM', 'Slim Fit Denim Jeans', 'Classic indigo slim-fit denim jeans.', 5::bigint, 3499.00::numeric),
    ('Clothing', 'CLO-SHOES-RUN', 'Everyday Running Shoes', 'Lightweight cushioned running shoes.', 4::bigint, 5999.00::numeric),
    ('Clothing', 'CLO-HOODIE-WIN', 'Winter Fleece Hoodie', 'Warm brushed-fleece zip hoodie.', 4::bigint, 4299.00::numeric),
    ('Electronics', 'ELEC-TYPEC-1M', 'Type-C Cable', 'Braided 1-metre USB Type-C charging cable.', 10::bigint, 1599.00::numeric),
    ('Electronics', 'ELEC-MOUSE-WL', 'Wireless Mouse', 'Ergonomic 2.4 GHz wireless optical mouse.', 8::bigint, 2999.00::numeric),
    ('Electronics', 'ELEC-HUB-USB', '4-Port USB Hub', 'Compact USB 3.0 four-port hub.', 6::bigint, 2499.00::numeric),
    ('Electronics', 'ELEC-PBANK-10K', '10000mAh Power Bank', 'Dual-output fast-charging power bank.', 5::bigint, 5499.00::numeric),
    ('Household', 'HOU-DISH-750', 'Lemon Dishwashing Liquid 750ml', 'Concentrated lemon dishwashing liquid.', 10::bigint, 449.00::numeric),
    ('Household', 'HOU-TOWEL-MF', 'Microfiber Cleaning Towels', 'Pack of four reusable microfiber towels.', 6::bigint, 799.00::numeric),
    ('Household', 'HOU-LED-12W', '12W LED Bulb', 'Energy-saving daylight LED bulb.', 5::bigint, 599.00::numeric),
    ('Household', 'HOU-STORAGE-20L', '20L Storage Box', 'Stackable lidded household storage box.', 5::bigint, 1899.00::numeric)
  ) as seed(category_name, sku, name, description, low_stock_threshold, selling_price)
  join public.categories category on category.name = seed.category_name;

  insert into public.product_financials (product_id, cost_price)
  select product.id, seed.cost_price
  from (values
    ('GRO-RICE-5KG', 1780.00::numeric), ('GRO-OIL-1L', 545.00::numeric),
    ('GRO-CEREAL-500G', 620.00::numeric), ('CLO-TSHIRT-COT', 780.00::numeric),
    ('CLO-JEANS-SLIM', 2150.00::numeric), ('CLO-SHOES-RUN', 3900.00::numeric),
    ('CLO-HOODIE-WIN', 2700.00::numeric), ('ELEC-TYPEC-1M', 900.00::numeric),
    ('ELEC-MOUSE-WL', 1850.00::numeric), ('ELEC-HUB-USB', 1500.00::numeric),
    ('ELEC-PBANK-10K', 3700.00::numeric), ('HOU-DISH-750', 285.00::numeric),
    ('HOU-TOWEL-MF', 450.00::numeric), ('HOU-LED-12W', 330.00::numeric),
    ('HOU-STORAGE-20L', 1120.00::numeric)
  ) as seed(sku, cost_price)
  join public.products product on product.sku = seed.sku;

  -- Initial receipts. The supplier is used only for stock_in, matching the
  -- database constraint and normal StockSense movement contract.
  insert into public.stock_movements (product_id, movement_type, quantity, supplier_id)
  select product.id, 'stock_in'::public.stock_movement_type, seed.quantity,
         (select supplier.id from public.suppliers supplier
          where supplier.name = seed.supplier_name order by supplier.id limit 1)
  from (values
    ('GRO-RICE-5KG', 20::bigint, 'FreshMart Distribution'),
    ('GRO-OIL-1L', 55::bigint, 'FreshMart Distribution'),
    ('GRO-CEREAL-500G', 15::bigint, 'FreshMart Distribution'),
    ('CLO-TSHIRT-COT', 50::bigint, 'Metro Textiles'),
    ('CLO-JEANS-SLIM', 25::bigint, 'Metro Textiles'),
    ('CLO-SHOES-RUN', 18::bigint, 'Metro Textiles'),
    ('CLO-HOODIE-WIN', 12::bigint, 'Metro Textiles'),
    ('ELEC-TYPEC-1M', 40::bigint, 'Ali Traders'),
    ('ELEC-MOUSE-WL', 45::bigint, 'Ali Traders'),
    ('ELEC-HUB-USB', 20::bigint, 'Ali Traders'),
    ('ELEC-PBANK-10K', 30::bigint, 'Ali Traders'),
    ('HOU-DISH-750', 45::bigint, 'HomeCare Wholesale'),
    ('HOU-TOWEL-MF', 15::bigint, 'HomeCare Wholesale'),
    ('HOU-LED-12W', 12::bigint, 'HomeCare Wholesale'),
    ('HOU-STORAGE-20L', 24::bigint, 'HomeCare Wholesale')
  ) as seed(sku, quantity, supplier_name)
  join public.products product on product.sku = seed.sku;

  -- Sales are split into multiple ledger entries so current-week reporting
  -- exercises aggregation rather than relying on one synthetic total.
  insert into public.stock_movements (product_id, movement_type, quantity)
  select product.id, seed.movement_type::public.stock_movement_type, seed.quantity
  from (values
    ('GRO-RICE-5KG', 'sale', 12::bigint), ('GRO-RICE-5KG', 'damaged', 3::bigint),
    ('GRO-OIL-1L', 'sale', 6::bigint), ('GRO-OIL-1L', 'sale', 4::bigint), ('GRO-OIL-1L', 'damaged', 5::bigint),
    ('GRO-CEREAL-500G', 'sale', 6::bigint), ('GRO-CEREAL-500G', 'damaged', 1::bigint),
    ('CLO-TSHIRT-COT', 'sale', 12::bigint), ('CLO-TSHIRT-COT', 'sale', 8::bigint),
    ('CLO-JEANS-SLIM', 'sale', 7::bigint),
    ('CLO-SHOES-RUN', 'sale', 5::bigint), ('CLO-SHOES-RUN', 'damaged', 1::bigint),
    ('CLO-HOODIE-WIN', 'sale', 10::bigint), ('CLO-HOODIE-WIN', 'damaged', 2::bigint),
    ('ELEC-TYPEC-1M', 'sale', 15::bigint), ('ELEC-TYPEC-1M', 'sale', 8::bigint), ('ELEC-TYPEC-1M', 'damaged', 2::bigint),
    ('ELEC-MOUSE-WL', 'sale', 10::bigint), ('ELEC-MOUSE-WL', 'sale', 8::bigint), ('ELEC-MOUSE-WL', 'damaged', 2::bigint),
    ('ELEC-HUB-USB', 'sale', 7::bigint), ('ELEC-HUB-USB', 'sale', 5::bigint), ('ELEC-HUB-USB', 'damaged', 4::bigint),
    ('ELEC-PBANK-10K', 'sale', 8::bigint), ('ELEC-PBANK-10K', 'damaged', 2::bigint),
    ('HOU-DISH-750', 'sale', 8::bigint), ('HOU-DISH-750', 'damaged', 2::bigint),
    ('HOU-TOWEL-MF', 'sale', 7::bigint), ('HOU-TOWEL-MF', 'damaged', 2::bigint),
    ('HOU-LED-12W', 'sale', 10::bigint), ('HOU-LED-12W', 'damaged', 2::bigint),
    ('HOU-STORAGE-20L', 'sale', 6::bigint)
  ) as seed(sku, movement_type, quantity)
  join public.products product on product.sku = seed.sku;
end
$seed$;

commit;
