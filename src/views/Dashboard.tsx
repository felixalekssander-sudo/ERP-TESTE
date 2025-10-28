import { useState, useEffect } from 'react';
import { ShoppingCart, Factory, AlertTriangle, CheckCircle, Package, TrendingUp } from 'lucide-react';
import { googleSheets } from '../lib/googleSheets';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    ordersInProduction: 0,
    delayedOrders: 0,
    completedOrders: 0,
    pendingInspections: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const orders = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.sales_orders);
    const production = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.production_orders);
    const inspections = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.quality_inspections);
    const inventory = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.inventory);

    const now = new Date();
    const delayed = production.filter(p =>
      p.status === 'in_progress' &&
      p.planned_end &&
      new Date(p.planned_end) < now
    ).length;

    const lowStock = inventory.filter(i =>
      parseFloat(i.quantity) < parseFloat(i.minimum_stock)
    ).length;

    setStats({
      totalOrders: orders.length,
      ordersInProduction: production.filter(p => p.status === 'in_progress').length,
      delayedOrders: delayed,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      pendingInspections: inspections.filter(i => i.status === 'pending').length,
      lowStockItems: lowStock,
    });
  };

  const cards = [
    { title: 'Total de Pedidos', value: stats.totalOrders, icon: ShoppingCart, color: 'bg-blue-500' },
    { title: 'Em Produção', value: stats.ordersInProduction, icon: Factory, color: 'bg-yellow-500' },
    { title: 'Ordens Atrasadas', value: stats.delayedOrders, icon: AlertTriangle, color: 'bg-red-500' },
    { title: 'Concluídos', value: stats.completedOrders, icon: CheckCircle, color: 'bg-green-500' },
    { title: 'Inspeções Pendentes', value: stats.pendingInspections, icon: TrendingUp, color: 'bg-purple-500' },
    { title: 'Estoque Baixo', value: stats.lowStockItems, icon: Package, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`${card.color} p-4 rounded-lg`}>
                  <Icon className="text-white" size={32} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Visão Geral do Sistema</h3>
        <p className="text-slate-600 mb-4">
          Bem-vindo ao Sistema de Gestão de Produção de Usinagem. Use o menu lateral para navegar entre os módulos.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold mb-2">Pedidos de Venda</h4>
            <p className="text-slate-600">Gerencie pedidos e gere propostas automaticamente</p>
          </div>
          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="font-semibold mb-2">Produção</h4>
            <p className="text-slate-600">Controle ordens de produção e processos (torneamento, fresamento, furação, retificação)</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold mb-2">Qualidade</h4>
            <p className="text-slate-600">Inspeções automáticas baseadas em critérios configuráveis</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold mb-2">Compras e Estoque</h4>
            <p className="text-slate-600">Gerencie materiais e custos por ordem de produção</p>
          </div>
        </div>
      </div>
    </div>
  );
}
