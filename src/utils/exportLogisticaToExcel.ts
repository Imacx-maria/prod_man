import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Types for the data structure
interface ExportLogisticaRow {
  numero_orc?: string;
  numero_fo?: string;
  descricao?: string;
  guia?: string;
  id_cliente?: string;
  local_recolha?: string;
  local_entrega?: string;
  transportadora?: string;
  notas?: string;
  contacto?: string;
  telefone?: string;
  contacto_entrega?: string;
  telefone_entrega?: string;
  quantidade?: number;
}

interface ClienteLookup {
  value: string;
  label: string;
  morada?: string;
  codigo_pos?: string;
}

interface ExportLogisticaOptions {
  filteredRecords: ExportLogisticaRow[];
  selectedDate: Date | null;
  clientes?: ClienteLookup[];
}

export const exportLogisticaToExcel = ({ filteredRecords, selectedDate, clientes = [] }: ExportLogisticaOptions): void => {
  // Debug: Log received arguments
  console.log('exportLogisticaToExcel called with:', { filteredRecords, selectedDate, clientes });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Logistica');

  // Column definitions (for order and count)
  const columns = [
    { header: 'ORC', key: 'numero_orc' },
    { header: 'FO', key: 'numero_fo' },
    { header: 'Descrição', key: 'descricao' },
    { header: 'Guia', key: 'guia' },
    { header: 'Cliente', key: 'id_cliente' },
    { header: 'Local Recolha', key: 'local_recolha' },
    { header: 'Local Entrega', key: 'local_entrega' },
    { header: 'Transportadora', key: 'transportadora' },
    { header: 'Notas', key: 'notas' },
    { header: 'QT', key: 'quantidade' },
  ];

  // 1. Title row
  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = 'Listagem de Recolhas e Entregas';
  titleCell.font = { size: 18, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Date row
  worksheet.mergeCells(2, 1, 2, columns.length);
  const dateCell = worksheet.getCell(2, 1);
  dateCell.value = selectedDate ? selectedDate.toLocaleDateString() : '';
  dateCell.font = { size: 12 };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Blank line (row 3)
  worksheet.mergeCells(3, 1, 3, columns.length);

  // 4. Header row (row 4)
  const headerRow = worksheet.addRow(columns.map(col => col.header));
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F4F4F' }, // oklch(0.31 0 0) ≈ #4F4F4F
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Compute localRecolha/localEntrega for sorting
  const getLocalRecolha = (row: any) => {
    if (!clientes.length) return '';
    const recolhaObj = clientes.find(c => c.value === ((row as any)['id_local_recolha'] || ''));
    if (recolhaObj) {
      const moradaLinha = [recolhaObj.morada, recolhaObj.codigo_pos].filter(Boolean).join(' ');
      return recolhaObj.label + (moradaLinha ? ` ${moradaLinha}` : '');
    }
    return '';
  };
  const getLocalEntrega = (row: any) => {
    if (!clientes.length) return '';
    const entregaObj = clientes.find(c => c.value === ((row as any)['id_local_entrega'] || ''));
    if (entregaObj) {
      const moradaLinha = [entregaObj.morada, entregaObj.codigo_pos].filter(Boolean).join(' ');
      return entregaObj.label + (moradaLinha ? ` ${moradaLinha}` : '');
    }
    return '';
  };
  // Sort by FO, then Local Recolha, then Local Entrega
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    // FO (numero_fo) numeric ascending
    const foA = Number(a.numero_fo) || 0;
    const foB = Number(b.numero_fo) || 0;
    if (foA !== foB) return foA - foB;
    // Local Recolha (alphabetical)
    const recA = getLocalRecolha(a).toLowerCase();
    const recB = getLocalRecolha(b).toLowerCase();
    if (recA !== recB) return recA.localeCompare(recB);
    // Local Entrega (alphabetical)
    const entA = getLocalEntrega(a).toLowerCase();
    const entB = getLocalEntrega(b).toLowerCase();
    return entA.localeCompare(entB);
  });

  // 5. Data rows (start at row 5)
  sortedRecords.forEach((row, idx) => {
    // Concatenate Local Recolha and Local Entrega with morada and codigo_pos
    let localRecolha = '';
    let localEntrega = '';
    if (clientes.length) {
      localRecolha = getLocalRecolha(row);
      localEntrega = getLocalEntrega(row);
    }
    // Concatenate Notas with contacts, grouped and titled
    let notasConcat = row.notas ? row.notas : '';
    const parts: string[] = [];
    if (notasConcat) parts.push(notasConcat);
    if (row.contacto) parts.push('\nCont. Recolh.\n' + row.contacto);
    if (row.telefone) parts.push('Tel. Recolh.\n' + row.telefone);
    if (row.contacto_entrega) parts.push('Cont. Entreg.\n' + row.contacto_entrega);
    if (row.telefone_entrega) parts.push('Tel. Entreg.\n' + row.telefone_entrega);
    let fullNotas = parts.join('\n\n');
    const values = columns.map(col => {
      if (col.key === 'local_recolha') return localRecolha;
      if (col.key === 'local_entrega') return localEntrega;
      if (col.key === 'notas') return fullNotas;
      return row[col.key as keyof ExportLogisticaRow] ?? '';
    });
    const excelRow = worksheet.addRow(values);
    const fillColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF3F4F6'; // white / secondary
    excelRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      };
      // Only vertical borders
      cell.border = {
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      // Align all cells to top
      cell.alignment = { ...cell.alignment, vertical: 'top' };
    });
    // Wrap text for Descrição, Cliente, Notas, Local Recolha, and Local Entrega columns
    const descricaoColIdx = columns.findIndex(col => col.key === 'descricao') + 1;
    const clienteColIdx = columns.findIndex(col => col.key === 'id_cliente') + 1;
    const notasColIdx = columns.findIndex(col => col.key === 'notas') + 1;
    const localRecolhaColIdx = columns.findIndex(col => col.key === 'local_recolha') + 1;
    const localEntregaColIdx = columns.findIndex(col => col.key === 'local_entrega') + 1;
    if (descricaoColIdx > 0) excelRow.getCell(descricaoColIdx).alignment = { ...excelRow.getCell(descricaoColIdx).alignment, wrapText: true, vertical: 'top' };
    if (clienteColIdx > 0) excelRow.getCell(clienteColIdx).alignment = { ...excelRow.getCell(clienteColIdx).alignment, wrapText: true, vertical: 'top' };
    if (notasColIdx > 0) excelRow.getCell(notasColIdx).alignment = { ...excelRow.getCell(notasColIdx).alignment, wrapText: true, vertical: 'top' };
    if (localRecolhaColIdx > 0) excelRow.getCell(localRecolhaColIdx).alignment = { ...excelRow.getCell(localRecolhaColIdx).alignment, wrapText: true, vertical: 'top' };
    if (localEntregaColIdx > 0) excelRow.getCell(localEntregaColIdx).alignment = { ...excelRow.getCell(localEntregaColIdx).alignment, wrapText: true, vertical: 'top' };
  });

  // 6. Add a single border around the table (rectangle)
  const dataStartRow = 4;
  const dataEndRow = 4 + sortedRecords.length;
  if (sortedRecords.length > 0) {
    for (let col = 1; col <= columns.length; col++) {
      // Top border
      worksheet.getCell(dataStartRow, col).border = {
        ...worksheet.getCell(dataStartRow, col).border,
        top: { style: 'thin' },
      };
      // Bottom border
      worksheet.getCell(dataEndRow, col).border = {
        ...worksheet.getCell(dataEndRow, col).border,
        bottom: { style: 'thin' },
      };
    }
    // Left and right borders for the whole table
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      worksheet.getCell(row, 1).border = {
        ...worksheet.getCell(row, 1).border,
        left: { style: 'thin' },
      };
      worksheet.getCell(row, columns.length).border = {
        ...worksheet.getCell(row, columns.length).border,
        right: { style: 'thin' },
      };
    }
  }

  // 7. Auto width for columns (fit to widest header or cell in the column)
  worksheet.columns = columns.map((col, i) => {
    if (col.key === 'descricao') {
      return { key: String(i), width: 38 };
    }
    if (col.key === 'id_cliente') {
      return { key: String(i), width: 31 };
    }
    if (col.key === 'local_recolha' || col.key === 'local_entrega') {
      return { key: String(i), width: 30 };
    }
    if (col.key === 'notas') {
      return { key: String(i), width: 42 };
    }
    return { key: String(i) };
  });
  columns.forEach((col, colIdx) => {
    let maxLength = col.header.length;
    sortedRecords.forEach(row => {
      const value = row[col.key as keyof ExportLogisticaRow];
      if (value !== undefined && value !== null) {
        const str = value.toString();
        if (str.length > maxLength) maxLength = str.length;
      }
    });
    // Only auto-fit columns that are not fixed width
    if (['descricao','id_cliente','local_recolha','local_entrega','notas'].includes(col.key)) {
      // Do not auto-fit, keep fixed width
      return;
    }
    worksheet.getColumn(colIdx + 1).width = maxLength + 2;
  });

  // 8. Download
  workbook.xlsx.writeBuffer().then(buffer => {
    saveAs(new Blob([buffer]), `logistica_${selectedDate ? selectedDate.toISOString().slice(0,10) : 'all'}.xlsx`);
  });
}; 