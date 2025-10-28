const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

const SHEET_NAMES = {
  customers: 'clientes',
  products: 'produtos',
  sales_orders: 'pedidos_venda',
  sales_order_items: 'itens_pedido',
  proposals: 'propostas',
  production_orders: 'ordens_producao',
  production_processes: 'processos_producao',
  purchases: 'compras',
  inventory: 'estoque',
  inventory_movements: 'movimentacoes_estoque',
  quality_inspections: 'inspecoes_qualidade',
  inspection_criteria: 'criterios_inspecao',
  suppliers: 'fornecedores',
  notifications: 'notificacoes',
};

interface CacheEntry {
  data: any[];
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 5000;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function fetchFromSheet(sheetName: string): Promise<any[]> {
  const cacheKey = sheetName;
  const now = Date.now();

  if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  try {
    const range = `${sheetName}!A:ZZ`;
    const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from Google Sheets: ${response.statusText}`);
    }

    const result = await response.json();
    const rows = result.values || [];

    if (rows.length === 0) {
      cache[cacheKey] = { data: [], timestamp: now };
      return [];
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    cache[cacheKey] = { data, timestamp: now };
    return data;
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return [];
  }
}

async function appendToSheet(sheetName: string, data: any): Promise<any> {
  invalidateCache(sheetName);

  const id = data.id || generateId();
  const timestamp = new Date().toISOString();

  const rowData = {
    ...data,
    id,
    created_at: data.created_at || timestamp,
  };

  try {
    const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW&key=${API_KEY}`;

    const existingData = await fetchFromSheet(sheetName);
    const headers = existingData.length > 0 ? Object.keys(existingData[0]) : Object.keys(rowData);

    const values = headers.map(header => rowData[header] || '');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [values],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to append to Google Sheets: ${response.statusText}`);
    }

    return rowData;
  } catch (error) {
    console.error('Error appending to Google Sheets:', error);
    throw error;
  }
}

async function updateInSheet(sheetName: string, id: string, updates: any): Promise<any> {
  invalidateCache(sheetName);

  try {
    const data = await fetchFromSheet(sheetName);
    const index = data.findIndex(row => row.id === id);

    if (index === -1) {
      throw new Error(`Record with id ${id} not found`);
    }

    const updatedRow = {
      ...data[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const headers = Object.keys(data[0]);
    const values = headers.map(header => updatedRow[header] || '');

    const rowNumber = index + 2;
    const range = `${sheetName}!A${rowNumber}:ZZ${rowNumber}`;
    const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW&key=${API_KEY}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [values],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update Google Sheets: ${response.statusText}`);
    }

    return updatedRow;
  } catch (error) {
    console.error('Error updating Google Sheets:', error);
    throw error;
  }
}

async function deleteFromSheet(sheetName: string, id: string): Promise<void> {
  invalidateCache(sheetName);

  try {
    const data = await fetchFromSheet(sheetName);
    const index = data.findIndex(row => row.id === id);

    if (index === -1) {
      throw new Error(`Record with id ${id} not found`);
    }

    const rowNumber = index + 2;
    const sheetId = await getSheetId(sheetName);

    const url = `${BASE_URL}/${SPREADSHEET_ID}:batchUpdate?key=${API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete from Google Sheets: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting from Google Sheets:', error);
    throw error;
  }
}

async function getSheetId(sheetName: string): Promise<number> {
  const url = `${BASE_URL}/${SPREADSHEET_ID}?key=${API_KEY}`;
  const response = await fetch(url);
  const spreadsheet = await response.json();

  const sheet = spreadsheet.sheets?.find((s: any) => s.properties.title === sheetName);
  return sheet?.properties?.sheetId || 0;
}

function invalidateCache(sheetName: string) {
  delete cache[sheetName];
}

export const googleSheets = {
  SHEET_NAMES,
  fetchFromSheet,
  appendToSheet,
  updateInSheet,
  deleteFromSheet,
  invalidateCache,
};
