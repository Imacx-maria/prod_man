CREATE OR REPLACE FUNCTION update_item_complexity(p_item_id UUID, p_complexity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the items_base table
  UPDATE items_base
  SET complexidade_id = p_complexity_id,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_item_id
  RETURNING jsonb_build_object(
    'id', id,
    'complexidade_id', complexidade_id,
    'updated_at', updated_at
  ) INTO v_result;

  -- Return the result
  RETURN v_result;
END;
$$; 