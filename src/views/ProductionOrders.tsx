import { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle, Eye, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseCompat';
import type { ProductionOrder, ProductionProcess } from '../lib/types';

interface ProductionOrdersProps {
  onNavigate: (view: string, data?: any) => void;
}

export default function ProductionOrders({ onNavigate }: ProductionOrdersProps) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('production_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'production_orders' },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from('production_orders')
      .select(`
        *,
        product:products(*),
        sales_order:sales_orders(order_number, customer:customers(name))
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
  };

  const startProcess = async (orderId: string, currentProcess: string) => {
    await supabase
      .from('production_orders')
      .update({
        status: 'in_progress',
        actual_start: new Date().toISOString(),
        current_process: currentProcess,
      })
      .eq('id', orderId);

    await supabase
      .from('production_processes')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('production_order_id', orderId)
      .eq('process_type', currentProcess);

    loadOrders();
  };

  const completeOrder = async (orderId: string) => {
    await supabase
      .from('production_orders')
      .update({
        status: 'completed',
        actual_end: new Date().toISOString(),
      })
      .eq('id', orderId);

    await supabase.from('notifications').insert({
      type: 'process_completed',
      title: 'Ordem de Produção Concluída',
      message: `Ordem ${orders.find(o => o.id === orderId)?.order_number} foi concluída`,
      reference_type: 'production_order',
      reference_id: orderId,
    });

    loadOrders();
  };

  const filteredOrders = orders.filter(order =>
    filterStatus === 'all' || order.status === filterStatus
  );

  const priorityColors = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };

  const statusColors = {
    pending: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    on_hold: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    on_hold: 'Pausado',
  };

  return (
    <div>
      <div className="mb-6 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos os Status</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluído</option>
          <option value="on_hold">Pausado</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map((order) => {
          const isDelayed = order.planned_end &&
            new Date(order.planned_end) < new Date() &&
            order.status !== 'completed';

          return (
            <div key={order.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{order.order_number}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[order.priority]}`}>
                      {priorityLabels[order.priority]}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    {isDelayed && (
                      <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        <AlertCircle size={14} />
                        Atrasado
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600">
                    Produto: <span className="font-medium">{order.product?.name}</span>
                  </p>
                  <p className="text-slate-600">
                    Cliente: <span className="font-medium">{order.sales_order?.customer?.name}</span>
                  </p>
                  <p className="text-slate-600">
                    Quantidade: <span className="font-medium">{order.quantity} peças</span>
                  </p>
                  {order.current_process && (
                    <p className="text-slate-600">
                      Processo Atual: <span className="font-medium capitalize">{order.current_process}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => startProcess(order.id, 'turning')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Play size={18} />
                      Iniciar
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => completeOrder(order.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <CheckCircle size={18} />
                      Concluir
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('production-view', order)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                  >
                    <Eye size={18} />
                    Detalhes
                  </button>
                </div>
              </div>

              {order.planned_end && (
                <div className="text-sm text-slate-600">
                  Prazo: {new Date(order.planned_end).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
            Nenhuma ordem de produção encontrada
          </div>
        )}
      </div>
    </div>
  );
}
