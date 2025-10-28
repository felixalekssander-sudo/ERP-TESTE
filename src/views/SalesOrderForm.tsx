import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { googleSheets } from '../lib/googleSheets';
import ProductAutocomplete from '../components/ProductAutocomplete';
import MaterialAutocomplete from '../components/MaterialAutocomplete';
import { useNCMGenerator } from '../hooks/useNCMGenerator';
import type { Customer, SalesOrder } from '../lib/types';

interface SalesOrderFormProps {
  onNavigate: (view: string) => void;
  editData?: SalesOrder;
}

interface ProductMaterial {
  id?: string;
  temp_id: string;
  material_id: string;
  material_name: string;
  ncm: string;
  quantity: number;
  unit_price: number;
}

interface OrderItem {
  id?: string;
  temp_id: string;
  product_id: string;
  product_name: string;
  ncm: string;
  deadline: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  final_price: number;
  materials: ProductMaterial[];
  showMaterials: boolean;
}

export default function SalesOrderForm({ onNavigate, editData }: SalesOrderFormProps) {
  const { generateNCM } = useNCMGenerator();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{
    temp_id: crypto.randomUUID(),
    product_id: '',
    product_name: '',
    ncm: '',
    deadline: '15d',
    unit: 'PC',
    quantity: 1.0000,
    unit_price: 0,
    total_price: 0,
    final_price: 0,
    materials: [],
    showMaterials: false,
  }]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.customers);
    const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
    setCustomers(sorted);
  };

  const createCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('Por favor, insira o nome do cliente');
      return;
    }

    try {
      const data = await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.customers, newCustomer);
      await loadCustomers();
      setSelectedCustomer(data.id);
      setShowNewCustomer(false);
      setNewCustomer({ name: '', email: '', phone: '', company: '', address: '' });
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Erro ao criar cliente');
    }
  };

  const addItem = async () => {
    const ncm = await generateNCM('product');
    setItems([...items, {
      temp_id: crypto.randomUUID(),
      product_id: '',
      product_name: '',
      ncm,
      deadline: '15d',
      unit: 'PC',
      quantity: 1.0000,
      unit_price: 0,
      total_price: 0,
      final_price: 0,
      materials: [],
      showMaterials: false,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'materials') {
      calculateItemPrice(newItems, index);
    }

    setItems(newItems);
  };

  const calculateItemPrice = (itemsArray: OrderItem[], index: number) => {
    const item = itemsArray[index];

    const materialsCost = item.materials.reduce((sum, mat) =>
      sum + (mat.quantity * mat.unit_price), 0
    );

    item.unit_price = materialsCost;
    item.total_price = materialsCost * item.quantity;
    item.final_price = item.total_price;
  };

  const handleProductSelect = async (index: number, product: any) => {
    const ncm = product.ncm && product.ncm.trim() !== '' ? product.ncm : await generateNCM('product');

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      product_id: product.id,
      product_name: product.name,
      ncm,
      deadline: product.deadline || '15d',
      unit: product.unit || 'PC',
      unit_price: product.unit_price || 0,
      total_price: product.total_price || 0,
      final_price: product.final_price || 0,
    };

    setItems(newItems);

    await loadProductMaterials(product.id, index);
  };

  const loadProductMaterials = async (productId: string, itemIndex: number) => {
    updateItem(itemIndex, 'materials', []);
  };

  const addMaterial = async (itemIndex: number) => {
    const ncm = await generateNCM('material');
    const newItems = [...items];
    newItems[itemIndex].materials.push({
      temp_id: crypto.randomUUID(),
      material_id: '',
      material_name: '',
      ncm,
      quantity: 1.0000,
      unit_price: 0,
    });
    setItems(newItems);
  };

  const removeMaterial = (itemIndex: number, materialIndex: number) => {
    const newItems = [...items];
    newItems[itemIndex].materials = newItems[itemIndex].materials.filter((_, i) => i !== materialIndex);
    calculateItemPrice(newItems, itemIndex);
    setItems(newItems);
  };

  const updateMaterial = (itemIndex: number, materialIndex: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[itemIndex].materials[materialIndex] = {
      ...newItems[itemIndex].materials[materialIndex],
      [field]: value,
    };
    calculateItemPrice(newItems, itemIndex);
    setItems(newItems);
  };

  const handleMaterialSelect = async (itemIndex: number, materialIndex: number, material: any) => {
    const ncm = material.ncm || await generateNCM('material');
    updateMaterial(itemIndex, materialIndex, 'material_id', material.id);
    updateMaterial(itemIndex, materialIndex, 'material_name', material.name);
    updateMaterial(itemIndex, materialIndex, 'ncm', ncm);
    updateMaterial(itemIndex, materialIndex, 'unit_price', material.unit_price);
  };

  const saveProduct = async (item: OrderItem) => {
    if (!item.product_id) return;

    await googleSheets.updateInSheet(googleSheets.SHEET_NAMES.products, item.product_id, {
      ncm: item.ncm,
      deadline: item.deadline,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      final_price: item.final_price,
    });
  };

  const saveOrder = async () => {
    if (!selectedCustomer || items.length === 0 || !items[0].product_id) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      for (const item of items) {
        await saveProduct(item);
      }

      const orderNumber = `PV-${Date.now().toString().slice(-8)}`;

      const orderData = await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.sales_orders, {
        order_number: orderNumber,
        customer_id: selectedCustomer,
        created_by: createdBy,
        notes,
        status: 'draft',
        updated_at: new Date().toISOString(),
      });

      for (const item of items) {
        await googleSheets.appendToSheet(googleSheets.SHEET_NAMES.sales_order_items, {
          sales_order_id: orderData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.final_price,
          total_price: item.final_price * item.quantity,
        });
      }

      alert('Pedido criado com sucesso!');
      onNavigate('sales');
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Erro ao salvar pedido');
    }
  };

  const totalOrder = items.reduce((sum, item) => sum + (item.final_price * item.quantity), 0);

  return (
    <div>
      <button
        onClick={() => onNavigate('sales')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft size={20} />
        Voltar
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6">Novo Pedido de Venda</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cliente *
            </label>
            {!showNewCustomer ? (
              <div className="flex gap-2">
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.company && `- ${customer.company}`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                >
                  <Plus size={20} />
                </button>
              </div>
            ) : (
              <div className="border border-slate-300 rounded-lg p-4">
                <h3 className="font-medium mb-3">Novo Cliente</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nome *"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="Telefone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createCustomer}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Salvar Cliente
                    </button>
                    <button
                      onClick={() => setShowNewCustomer(false)}
                      className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Criado por
            </label>
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="Nome do vendedor"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Itens do Pedido</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Adicionar Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 min-w-[280px]">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-28">Prazo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-36">NCM</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-28">Quant.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 w-36">Valor unit. (R$)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 w-36">Valor total (R$)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 w-36">Valor final (R$)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <React.Fragment key={item.temp_id}>
                    <tr className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3">
                        <ProductAutocomplete
                          value={item.product_name}
                          productId={item.product_id}
                          onSelect={(product) => handleProductSelect(index, product)}
                          onInputChange={(value) => updateItem(index, 'product_name', value)}
                        />
                        <button
                          onClick={() => updateItem(index, 'showMaterials', !item.showMaterials)}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1.5 font-medium"
                        >
                          {item.showMaterials ? 'Ocultar' : 'Mostrar'} materiais ({item.materials.length})
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.deadline}
                          onChange={(e) => updateItem(index, 'deadline', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.ncm}
                          onChange={(e) => updateItem(index, 'ncm', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="text-xs text-slate-500 mt-1 font-medium">{item.unit}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{item.unit_price.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{item.total_price.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{item.final_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {items.length > 1 && (
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>

                    {item.showMaterials && (
                      <tr>
                        <td></td>
                        <td colSpan={8} className="px-4 py-4 bg-slate-50">
                          <div className="border border-slate-300 rounded-lg p-5 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-sm text-slate-700">Materiais Utilizados</h4>
                              <button
                                onClick={() => addMaterial(index)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                              >
                                <Plus size={16} />
                                Adicionar Material
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-12 gap-3 mb-2 text-xs font-semibold text-slate-600">
                                <div className="col-span-5">Material</div>
                                <div className="col-span-3">NCM</div>
                                <div className="col-span-2">Quantidade</div>
                                <div className="col-span-2 text-right">Preço Unit. (R$)</div>
                                <div className="col-span-1"></div>
                              </div>
                              {item.materials.map((material, matIndex) => (
                                <div key={material.temp_id} className="grid grid-cols-12 gap-3 items-start">
                                  <div className="col-span-5">
                                    <MaterialAutocomplete
                                      value={material.material_name}
                                      materialId={material.material_id}
                                      onSelect={(mat) => handleMaterialSelect(index, matIndex, mat)}
                                      onInputChange={(value) => updateMaterial(index, matIndex, 'material_name', value)}
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <input
                                      type="text"
                                      value={material.ncm}
                                      onChange={(e) => updateMaterial(index, matIndex, 'ncm', e.target.value)}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-100 text-slate-600"
                                      placeholder="NCM"
                                      readOnly
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number"
                                      step="0.0001"
                                      value={material.quantity}
                                      onChange={(e) => updateMaterial(index, matIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="0.0000"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number"
                                      step="0.0001"
                                      value={material.unit_price}
                                      onChange={(e) => updateMaterial(index, matIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="0.0000"
                                    />
                                  </div>
                                  <div className="col-span-1 flex justify-center pt-1">
                                    <button
                                      onClick={() => removeMaterial(index, matIndex)}
                                      className="text-red-600 hover:text-red-800 transition-colors"
                                      title="Remover material"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {item.materials.length === 0 && (
                                <div className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-lg border border-slate-200">
                                  Nenhum material adicionado. Clique em "Adicionar Material" para começar.
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <div className="text-2xl font-bold">
            Total do Pedido: R$ {totalOrder.toFixed(2)}
          </div>
          <button
            onClick={saveOrder}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save size={20} />
            Salvar Pedido
          </button>
        </div>
      </div>
    </div>
  );
}
