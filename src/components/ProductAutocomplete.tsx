import { useState, useEffect, useRef } from 'react';
import { googleSheets } from '../lib/googleSheets';
import { Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  ncm: string;
  deadline: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  final_price: number;
}

interface ProductAutocompleteProps {
  value: string;
  productId: string;
  onSelect: (product: Product) => void;
  onInputChange: (value: string) => void;
}

export default function ProductAutocomplete({
  value,
  productId,
  onSelect,
  onInputChange
}: ProductAutocompleteProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [value, products]);

  const loadProducts = async () => {
    const data = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.products);
    const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
    setProducts(sorted);
  };

  const handleInputChange = (newValue: string) => {
    onInputChange(newValue);
    if (!showDropdown) {
      setShowDropdown(true);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setShowDropdown(false);
    onSelect(product);
  };

  const handleCreateNew = async () => {
    if (!value.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newProduct = await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.products, {
        name: value.trim(),
        ncm: '',
        deadline: '15d',
        unit: 'PC',
        quantity: 1.0000,
        unit_price: 0,
        total_price: 0,
        final_price: 0,
      });

      setProducts(prev => [...prev, newProduct]);
      setShowDropdown(false);
      onSelect(newProduct);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        placeholder="Digite para buscar ou criar produto..."
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelectProduct(product)}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-slate-600">
                  NCM: {product.ncm || 'N/A'} | Preço: R$ {product.final_price?.toFixed(2)}
                </div>
              </button>
            ))
          ) : value ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full px-4 py-3 text-left hover:bg-green-50 flex items-center gap-2 text-green-700"
            >
              <Plus size={18} />
              <span>Criar produto: <strong>{value}</strong></span>
            </button>
          ) : (
            <div className="px-4 py-3 text-slate-500 text-sm">
              Digite para buscar produtos
            </div>
          )}
        </div>
      )}
    </div>
  );
}
