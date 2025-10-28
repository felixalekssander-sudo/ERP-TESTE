import { googleSheets } from './googleSheets';

export const supabase = {
  from: (tableName: string) => ({
    select: (fields?: string) => ({
      eq: (field: string, value: any) => ({
        order: (orderField: string, options?: any) => ({
          limit: async (limitNum: number) => {
            const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
            const filtered = data.filter((row: any) => row[field] == value);
            const sorted = options?.ascending
              ? filtered.sort((a: any, b: any) => a[orderField] > b[orderField] ? 1 : -1)
              : filtered.sort((a: any, b: any) => a[orderField] < b[orderField] ? 1 : -1);
            return { data: sorted.slice(0, limitNum), error: null };
          },
          single: async () => {
            const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
            const filtered = data.filter((row: any) => row[field] == value);
            const sorted = options?.ascending
              ? filtered.sort((a: any, b: any) => a[orderField] > b[orderField] ? 1 : -1)
              : filtered.sort((a: any, b: any) => a[orderField] < b[orderField] ? 1 : -1);
            return { data: sorted[0] || null, error: null };
          },
        }),
        single: async () => {
          const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
          const found = data.find((row: any) => row[field] == value);
          return { data: found || null, error: null };
        },
      }),
      order: (orderField: string, options?: any) => ({
        limit: async (limitNum: number) => {
          const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
          const sorted = options?.ascending
            ? data.sort((a: any, b: any) => a[orderField] > b[orderField] ? 1 : -1)
            : data.sort((a: any, b: any) => a[orderField] < b[orderField] ? 1 : -1);
          return { data: sorted.slice(0, limitNum), error: null };
        },
        single: async () => {
          const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
          const sorted = options?.ascending
            ? data.sort((a: any, b: any) => a[orderField] > b[orderField] ? 1 : -1)
            : data.sort((a: any, b: any) => a[orderField] < b[orderField] ? 1 : -1);
          return { data: sorted[0] || null, error: null };
        },
      }),
      limit: async (limitNum: number) => {
        const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
        return { data: data.slice(0, limitNum), error: null };
      },
      single: async () => {
        const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
        return { data: data[0] || null, error: null };
      },
    }),
    insert: (values: any) => ({
      select: () => ({
        single: async () => {
          const data = await googleSheets.appendToSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName, values);
          return { data, error: null };
        },
      }),
      single: async () => {
        const data = await googleSheets.appendToSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName, values);
        return { data, error: null };
      },
    }),
    update: (values: any) => ({
      eq: (field: string, value: any) => ({
        select: () => ({
          single: async () => {
            const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
            const found = data.find((row: any) => row[field] == value);
            if (found) {
              await googleSheets.updateInSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName, found.id, values);
              return { data: { ...found, ...values }, error: null };
            }
            return { data: null, error: { message: 'Not found' } };
          },
        }),
      }),
    }),
    delete: () => ({
      eq: async (field: string, value: any) => {
        const data = await googleSheets.fetchFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName);
        const found = data.find((row: any) => row[field] == value);
        if (found) {
          await googleSheets.deleteFromSheet((googleSheets.SHEET_NAMES as any)[tableName] || tableName, found.id);
        }
        return { error: null };
      },
    }),
  }),
};
