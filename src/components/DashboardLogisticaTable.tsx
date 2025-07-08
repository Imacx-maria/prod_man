"use client"

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, Trash2, Copy, RefreshCcw, CheckSquare, Square } from 'lucide-react';
import NotasPopover from '@/components/ui/NotasPopover';
import ClienteCombobox from '@/components/ClienteCombobox';
import Combobox from '@/components/ui/Combobox';
import DatePicker from '@/components/ui/DatePicker';
import { createBrowserClient } from '@/utils/supabase';

interface DashboardLogisticaRecord {
  // From folhas_obras
  folha_obra_id: string;
  numero_fo: string;
  numero_orc?: number;
  nome_campanha: string;
  fo_data_saida?: string;
  fo_saiu?: boolean;
  cliente?: string;
  id_cliente?: string;
  
  // From items_base
  item_id: string;
  item_descricao: string;
  codigo?: string;
  quantidade?: number;
  brindes?: boolean;
  data_conc?: string;
  
  // From logistica_entregas (these fields moved here)
  logistica_id?: string;
  guia?: string;
  notas?: string;
  transportadora?: string;
  local_entrega?: string;
  local_recolha?: string;
  contacto?: string;
  telefone?: string;
  contacto_entrega?: string;
  telefone_entrega?: string;
  logistica_quantidade?: number;
  data?: string;
  id_local_entrega?: string;
  id_local_recolha?: string;
  // New/moved fields in logistica_entregas
  concluido?: boolean;
  data_concluido?: string;
  saiu?: boolean;
}

interface Cliente {
  value: string;
  label: string;
}

interface Transportadora {
  value: string;
  label: string;
}

interface DashboardLogisticaTableProps {
  onRefresh?: () => void;
}

// Define sortable columns type following the same pattern as main production table
type SortableLogisticaKey = 'numero_fo' | 'cliente' | 'nome_campanha' | 'item' | 'codigo' | 'guia' | 'transportadora' | 'local_recolha' | 'local_entrega' | 'data_saida' | 'saiu';

export const DashboardLogisticaTable: React.FC<DashboardLogisticaTableProps> = ({
  onRefresh
}) => {
  const [records, setRecords] = useState<DashboardLogisticaRecord[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDispatched, setShowDispatched] = useState(false);
  
  // Updated sorting state to match main production table pattern
  const [sortCol, setSortCol] = useState<SortableLogisticaKey>('numero_fo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Toggle sort function following the same pattern as main production table
  const toggleSort = useCallback((c: SortableLogisticaKey) => {
    if (sortCol === c) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortCol(c);
      setSortDir('asc');
    }
  }, [sortCol, sortDir]);

  const supabase = useMemo(() => createBrowserClient(), []);

  // Utility function to parse a date string as a local date (to avoid timezone issues)
  const parseDateFromYYYYMMDD = useCallback((dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, []);

  // Format date for database storage (YYYY-MM-DD)
  const formatDateForDB = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch data - show logistics for completed items that haven't been dispatched or have been dispatched
  const fetchData = useCallback(async (dispatched = false) => {
    setLoading(true);
    try {
      // Fetch work orders with their items and logistics entries
      // Show items where logistica_entregas.concluido = true
      let logisticsQuery = supabase
        .from('folhas_obras')
        .select(`
          id,
          numero_fo,
          numero_orc,
          nome_campanha,
          data_saida,
          saiu,
          cliente,
          id_cliente,
          items_base!inner (
            id,
            brindes,
            descricao,
            codigo,
            quantidade,
            data_conc,
            logistica_entregas!inner (
              id,
              guia,
              notas,
              transportadora,
              local_entrega,
              local_recolha,
              contacto,
              telefone,
              contacto_entrega,
              telefone_entrega,
              quantidade,
              data,
              id_local_entrega,
              id_local_recolha,
              created_at,
              concluido,
              data_concluido,
              saiu
            )
          )
        `)
        .eq('items_base.logistica_entregas.concluido', true);

      if (dispatched) {
        logisticsQuery = logisticsQuery.eq('items_base.logistica_entregas.saiu', true);
      }
      const { data: logisticsData, error: logisticsError } = await logisticsQuery.order('numero_fo');

      if (logisticsError) {
        console.error('Error fetching logistics:', logisticsError);
        return;
      }

      console.log('Fetched logistics data:', logisticsData);
      console.log('Logistics count:', logisticsData?.length || 0);

      // Fetch clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id, nome_cl')
        .order('nome_cl');

      if (clientesError) {
        console.error('Error fetching clientes:', clientesError);
      }

      // Fetch transportadoras
      const { data: transportadorasData, error: transportadorasError } = await supabase
        .from('transportadora')
        .select('id, name')
        .order('name');

      if (transportadorasError) {
        console.error('Error fetching transportadoras:', transportadorasError);
      }

      // Transform the nested data into flat records for each logistics entry
      const flatRecords: DashboardLogisticaRecord[] = [];
      (logisticsData || []).forEach(folhaObra => {
        if (!folhaObra.items_base) return;
        folhaObra.items_base.forEach((item: any) => {
          if (item.logistica_entregas && item.logistica_entregas.length > 0) {
            item.logistica_entregas.forEach((logistica: any) => {
              flatRecords.push({
                // From folhas_obras
                folha_obra_id: folhaObra.id,
                numero_fo: folhaObra.numero_fo,
                numero_orc: folhaObra.numero_orc,
                nome_campanha: folhaObra.nome_campanha,
                fo_data_saida: folhaObra.data_saida,
                fo_saiu: folhaObra.saiu,
                cliente: folhaObra.cliente,
                id_cliente: folhaObra.id_cliente,
                // From items_base
                item_id: item.id,
                item_descricao: item.descricao,
                codigo: item.codigo,
                quantidade: item.quantidade,
                brindes: item.brindes,
                data_conc: item.data_conc,
                // From logistica_entregas (including moved fields)
                logistica_id: logistica.id,
                guia: logistica.guia,
                notas: logistica.notas,
                transportadora: logistica.transportadora,
                local_entrega: logistica.local_entrega,
                local_recolha: logistica.local_recolha,
                contacto: logistica.contacto,
                telefone: logistica.telefone,
                contacto_entrega: logistica.contacto_entrega,
                telefone_entrega: logistica.telefone_entrega,
                logistica_quantidade: logistica.quantidade,
                data: logistica.data,
                id_local_entrega: logistica.id_local_entrega,
                id_local_recolha: logistica.id_local_recolha,
                concluido: logistica.concluido,
                data_concluido: logistica.data_concluido,
                saiu: logistica.saiu,
              });
            });
          }
        });
      });

      // Filter: only show records whose data_concluido is within the last 2 months and (saiu === false || saiu == null) if not dispatched
      const now = new Date();
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
      const filteredRecords = flatRecords.filter(record => {
        if (!record.data_concluido) return false;
        const date = new Date(record.data_concluido);
        const dateValid = !isNaN(date.getTime()) && date >= twoMonthsAgo;
        if (dispatched) {
          return record.saiu === true && dateValid;
        } else {
          return (record.saiu === false || record.saiu == null) && dateValid;
        }
      });

      console.log('Processed flat records:', filteredRecords);
      console.log('Flat records count:', filteredRecords.length);

      setRecords(filteredRecords);
      setClientes(clientesData?.map((c: any) => ({ value: c.id, label: c.nome_cl })) || []);
      setTransportadoras(transportadorasData?.map((t: any) => ({ value: t.id, label: t.name })) || []);
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // On mount and when showDispatched changes, refetch data
  useEffect(() => {
    fetchData(showDispatched);
  }, [fetchData, showDispatched]);

  // Create lookup dictionaries
  const clienteLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    clientes.forEach(cliente => {
      lookup[cliente.value] = cliente.label;
    });
    return lookup;
  }, [clientes]);

  const transportadoraLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    transportadoras.forEach(t => {
      lookup[t.value] = t.label;
    });
    return lookup;
  }, [transportadoras]);

  // Updated sorting logic following the same pattern as main production table
  const sorted = useMemo(() => {
    const arr = [...records];
    arr.sort((a, b) => {
      let A: any, B: any;
      switch (sortCol) {
        case 'numero_fo':
          A = a.numero_fo ?? '';
          B = b.numero_fo ?? '';
          break;
        case 'cliente': {
          const clientIdA = a.id_cliente;
          const clientIdB = b.id_cliente;
          A = (clientIdA ? clienteLookup[clientIdA] : '') || a.cliente || '';
          B = (clientIdB ? clienteLookup[clientIdB] : '') || b.cliente || '';
          break;
        }
        case 'nome_campanha':
          A = a.nome_campanha ?? '';
          B = b.nome_campanha ?? '';
          break;
        case 'item':
          A = a.item_descricao ?? '';
          B = b.item_descricao ?? '';
          break;
        case 'codigo':
          A = a.codigo ?? '';
          B = b.codigo ?? '';
          break;
        case 'guia':
          A = a.guia ?? '';
          B = b.guia ?? '';
          break;
        case 'transportadora': {
          const transIdA = a.transportadora;
          const transIdB = b.transportadora;
          A = (transIdA ? transportadoraLookup[transIdA] : '') || '';
          B = (transIdB ? transportadoraLookup[transIdB] : '') || '';
          break;
        }
        case 'local_recolha':
          A = a.local_recolha ?? '';
          B = b.local_recolha ?? '';
          break;
        case 'local_entrega':
          A = a.local_entrega ?? '';
          B = b.local_entrega ?? '';
          break;
        case 'data_saida':
          A = a.data ? new Date(a.data).getTime() : 0;
          B = b.data ? new Date(b.data).getTime() : 0;
          break;
        case 'saiu':
          A = a.saiu ?? false;
          B = b.saiu ?? false;
          break;
        default:
          A = a.numero_fo;
          B = b.numero_fo;
      }
      if (typeof A === 'string')
        return sortDir === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
      if (typeof A === 'number')
        return sortDir === 'asc' ? A - B : B - A;
      if (typeof A === 'boolean')
        return sortDir === 'asc' ? +A - +B : +B - +A;
      return 0;
    });
    return arr;
  }, [records, sortCol, sortDir, clienteLookup, transportadoraLookup]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchData(showDispatched);
    onRefresh?.();
  }, [fetchData, onRefresh, showDispatched]);

  // Update saiu status - now updates logistica_entregas instead of items_base
  const handleSaiuUpdate = useCallback(async (record: DashboardLogisticaRecord, value: boolean) => {
    try {
      if (!record.logistica_id) {
        console.error('Cannot update saiu: missing logistica_id', record);
        return;
      }
      
      // Update logistica_entregas saiu field
      await supabase.from('logistica_entregas').update({ saiu: value }).eq('id', record.logistica_id);
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error updating saiu status:', error);
    }
  }, [supabase, fetchData]);

  // Update data status - now updates logistica_entregas instead of items_base
  const handleDataSaidaUpdate = useCallback(async (record: DashboardLogisticaRecord, date: Date | null) => {
    try {
      if (!record.logistica_id) {
        console.error('Cannot update data: missing logistica_id', record);
        return;
      }
      
      const dateString = date ? formatDateForDB(date) : null;
      await supabase.from('logistica_entregas').update({ data: dateString }).eq('id', record.logistica_id);
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error updating data:', error);
    }
  }, [supabase, fetchData, formatDateForDB]);

  if (loading) {
    return (
      <div className="w-full px-6">
        <h2 className="text-2xl font-bold mb-4">Trabalhos Concluídos</h2>
        <div className="flex justify-center items-center h-40">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pl-6 pr-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Trabalhos Concluídos</h2>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowDispatched((v) => !v)}
                  aria-label={showDispatched ? 'Mostrar Não Despachados' : 'Mostrar Despachados'}
                  className="border-2 border-border"
                >
                  {showDispatched ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showDispatched ? 'Mostrar Não Despachados' : 'Mostrar Despachados'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" variant="outline" onClick={handleRefresh} title="Refresh data from Supabase">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-none border-2 border-border">
        <Table className="table-fixed w-full uppercase border-0">
          <TableHeader>
            <TableRow>
              <TableHead 
                onClick={() => toggleSort('numero_fo')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase w-20 border-b-2 border-border"
              >
                FO {sortCol === 'numero_fo' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('cliente')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase border-b-2 border-border"
              >
                Cliente {sortCol === 'cliente' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('nome_campanha')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase border-b-2 border-border"
              >
                Nome Campanha {sortCol === 'nome_campanha' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('item')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase border-b-2 border-border"
              >
                Item {sortCol === 'item' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('codigo')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase border-b-2 border-border"
              >
                Código {sortCol === 'codigo' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('guia')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase w-20 border-b-2 border-border"
              >
                Guia {sortCol === 'guia' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('transportadora')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase border-b-2 border-border"
              >
                Transportadora {sortCol === 'transportadora' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('local_recolha')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase border-b-2 border-border"
              >
                Local Recolha {sortCol === 'local_recolha' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('local_entrega')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase border-b-2 border-border"
              >
                Local Entrega {sortCol === 'local_entrega' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('data_saida')} 
                className="sticky top-0 z-10 cursor-pointer select-none bg-[var(--main)] text-black uppercase w-44 border-b-2 border-border"
              >
                Data Saída {sortCol === 'data_saida' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('saiu')} 
                className="sticky top-0 z-10 cursor-pointer select-none text-center bg-[var(--main)] text-black uppercase w-8 border-b-2 border-border"
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>S {sortCol === 'saiu' && (sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />)}</span>
                    </TooltipTrigger>
                    <TooltipContent>Saiu</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="w-8 bg-[var(--main)] border-b-2 border-border"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((record) => (
              <TableRow key={`${record.item_id}-${record.logistica_id || 'no-logistics'}`}>
                <TableCell>{record.numero_fo || '-'}</TableCell>
                <TableCell>
                  {(() => {
                    const clientId = record.id_cliente;
                    return (clientId ? clienteLookup[clientId] : '') || record.cliente || '-';
                  })()}
                </TableCell>
                <TableCell>{record.nome_campanha || '-'}</TableCell>
                <TableCell>{record.item_descricao || '-'}</TableCell>
                <TableCell>{record.codigo || '-'}</TableCell>
                <TableCell>{record.guia || '-'}</TableCell>
                <TableCell>
                  {(() => {
                    const transId = record.transportadora;
                    return (transId ? transportadoraLookup[transId] : '') || '-';
                  })()}
                </TableCell>
                <TableCell>{record.local_recolha || '-'}</TableCell>
                <TableCell>{record.local_entrega || '-'}</TableCell>
                <TableCell>
                  <DatePicker
                    selected={record.data ? 
                      parseDateFromYYYYMMDD(record.data.split('T')[0]) : 
                      undefined
                    }
                    onSelect={(date) => handleDataSaidaUpdate(record, date || null)}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={!!(record.saiu)}
                    onCheckedChange={(checked) => {
                      const value = checked === 'indeterminate' ? false : checked;
                      handleSaiuUpdate(record, value);
                    }}
                  />
                </TableCell>
                <TableCell className="w-8"></TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  Nenhum trabalho concluído encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DashboardLogisticaTable; 