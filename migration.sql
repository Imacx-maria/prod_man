-- Move complexidade_id from items_base to designer_items
ALTER TABLE designer_items ADD COLUMN complexidade_id UUID REFERENCES complexidade(id);

-- Copy existing complexity data
UPDATE designer_items di
SET complexidade_id = ib.complexidade_id
FROM items_base ib
WHERE di.item_id = ib.id;

-- Remove complexidade_id from items_base
ALTER TABLE items_base DROP COLUMN complexidade_id; 