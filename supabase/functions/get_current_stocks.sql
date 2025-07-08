-- Function to get current stock levels for all materials
-- This optimizes the stock calculation by doing it in the database instead of multiple round trips

CREATE OR REPLACE FUNCTION get_current_stocks()
RETURNS TABLE (
  id uuid,
  material text,
  cor text,
  tipo text,
  carateristica text,
  total_recebido numeric,
  total_consumido numeric,
  stock_atual numeric,
  stock_minimo numeric,
  stock_critico numeric
) 
LANGUAGE sql
AS $$
  SELECT 
    m.id,
    m.material,
    m.cor,
    m.tipo,
    m.carateristica,
    COALESCE(stocks_sum.total_recebido, 0) as total_recebido,
    COALESCE(operations_sum.total_consumido, 0) as total_consumido,
    COALESCE(stocks_sum.total_recebido, 0) - COALESCE(operations_sum.total_consumido, 0) as stock_atual,
    COALESCE(m.stock_minimo, 10) as stock_minimo,
    COALESCE(m.stock_critico, 0) as stock_critico
  FROM materiais m
  LEFT JOIN (
    SELECT 
      material_id,
      SUM(quantidade) as total_recebido
    FROM stocks 
    GROUP BY material_id
  ) stocks_sum ON m.id = stocks_sum.material_id
  LEFT JOIN (
    SELECT 
      material_id,
      SUM(num_placas_corte) as total_consumido
    FROM producao_operacoes 
    GROUP BY material_id
  ) operations_sum ON m.id = operations_sum.material_id
  ORDER BY stock_atual ASC, m.material ASC;
$$; 