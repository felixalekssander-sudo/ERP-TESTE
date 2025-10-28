import { useState, useEffect, useRef } from 'react';
import { googleSheets } from '../lib/googleSheets';
import { Plus } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  ncm: string;
  unit: string;
  unit_price: number;
}

interface MaterialAutocompleteProps {
  value: string;
  materialId: string;
  onSelect: (material: Material) => void;
  onInputChange: (value: string) => void;
}

export default function MaterialAutocomplete({
  value,
  materialId,
  onSelect,
  onInputChange
}: MaterialAutocompleteProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMaterials();
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
      const filtered = materials.filter(m =>
        m.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredMaterials(filtered);
    } else {
      setFilteredMaterials(materials);
    }
  }, [value, materials]);

  const loadMaterials = async () => {
    const data = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.inventory);
    const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
    setMaterials(sorted);
  };

  const handleInputChange = (newValue: string) => {
    onInputChange(newValue);
    setShowDropdown(true);
  };

  const handleSelectMaterial = (material: Material) => {
    onInputChange(material.name);
    onSelect(material);
    setShowDropdown(false);
  };

  const handleCreateNew = async () => {
    if (!value.trim()) return;

    const newMaterial = await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.inventory, {
      material_name: value.trim(),
      quantity: 0,
      unit: 'PC',
      unit_cost: 0,
      minimum_stock: 0,
      location: '',
      last_updated: new Date().toISOString(),
    });

    await loadMaterials();
    handleSelectMaterial(newMaterial);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        placeholder="Digite para buscar ou criar material..."
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredMaterials.length > 0 ? (
            filteredMaterials.map((material) => (
              <button
                key={material.id}
                type="button"
                onClick={() => handleSelectMaterial(material)}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="font-medium text-sm">{material.name}</div>
                <div className="text-xs text-slate-600">
                  NCM: {material.ncm || 'N/A'} | R$ {material.unit_price?.toFixed(4)}/{material.unit}
                </div>
              </button>
            ))
          ) : value ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full px-3 py-2 text-left hover:bg-green-50 flex items-center gap-2 text-green-700 text-sm"
            >
              <Plus size={16} />
              <span>Criar material: <strong>{value}</strong></span>
            </button>
          ) : (
            <div className="px-3 py-2 text-slate-500 text-xs">
              Digite para buscar materiais
            </div>
          )}
        </div>
      )}
    </div>
  );
}
