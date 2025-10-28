import { useState } from 'react';

export function useNCMGenerator() {
  const [loading, setLoading] = useState(false);

  const generateNCM = async (type: 'product' | 'material' = 'product'): Promise<string> => {
    setLoading(true);
    try {
      return generateLocalNCM();
    } finally {
      setLoading(false);
    }
  };

  const generateLocalNCM = (): string => {
    const category = Math.floor(Math.random() * 99) + 1;
    const subcategory = Math.floor(Math.random() * 99) + 1;
    const position = Math.floor(Math.random() * 99) + 1;
    const item = Math.floor(Math.random() * 99) + 1;

    return `${category.toString().padStart(2, '0')}${subcategory.toString().padStart(2, '0')}.${position.toString().padStart(2, '0')}.${item.toString().padStart(2, '0')}`;
  };

  return { generateNCM, loading };
}
