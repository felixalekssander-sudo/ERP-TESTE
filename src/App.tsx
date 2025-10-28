import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import SalesOrders from './views/SalesOrders';
import SalesOrderForm from './views/SalesOrderForm';
import Proposals from './views/Proposals';
import ProductionOrders from './views/ProductionOrders';
import ProductionOrderDetail from './views/ProductionOrderDetail';
import QualityInspections from './views/QualityInspections';
import InspectionCriteriaManager from './views/InspectionCriteriaManager';
import Purchases from './views/Purchases';
import PurchaseDetail from './views/PurchaseDetail';
import Suppliers from './views/Suppliers';
import Inventory from './views/Inventory';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewData, setViewData] = useState<any>(null);

  const handleNavigate = (view: string, data?: any) => {
    setCurrentView(view);
    setViewData(data);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'sales':
        return <SalesOrders onNavigate={handleNavigate} />;
      case 'sales-form':
        return <SalesOrderForm onNavigate={handleNavigate} editData={viewData} />;
      case 'proposals':
        return <Proposals />;
      case 'production':
        return <ProductionOrders onNavigate={handleNavigate} />;
      case 'production-view':
        return <ProductionOrderDetail orderId={viewData.id} onNavigate={handleNavigate} />;
      case 'quality':
        return <QualityInspections onNavigate={handleNavigate} />;
      case 'inspection-criteria':
        return <InspectionCriteriaManager />;
      case 'purchases':
        return <Purchases onNavigate={handleNavigate} />;
      case 'purchase-detail':
        return <PurchaseDetail purchaseId={viewData.id} onNavigate={handleNavigate} />;
      case 'suppliers':
        return <Suppliers />;
      case 'inventory':
        return <Inventory />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      {renderView()}
    </Layout>
  );
}

export default App;
