// frontend/src/App.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Button, message, Spin, Radio, Typography, Modal, Progress, Tag } from 'antd';
import { 
  RocketOutlined, 
  UserOutlined, 
  ClearOutlined,
  EnvironmentOutlined,
  DatabaseOutlined,
  SyncOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import Header from './components/Header';
import Map from './components/Map';
import OrderForm from './components/OrderForm';
import CourierForm from './components/CourierForm';
import DepotForm from './components/DepotForm';
import Stats from './components/Stats';
import RouteList from './components/RouteList';
import WeatherWidget from './components/WeatherWidget';
import ObstaclesWidget from './components/ObstaclesWidget';
import CourierInterface from './pages/CourierInterface';
import { api, Order as ApiOrder, Courier as ApiCourier } from './services/api';
import { Depot, OptimizationResponse } from './types';
import './index.css';

const { Content, Sider } = Layout;
const { Text } = Typography;

// Интерфейс для статусов доставок (локальный кэш)
interface DeliveryStatuses {
  [orderId: string]: 'pending' | 'delivered';
}

// Расширенный интерфейс заказа для работы с БД
interface ExtendedOrder extends ApiOrder {
  // Дополнительные поля для локального отображения
  _localStatus?: 'pending' | 'delivered';
}

function App() {
  const [viewMode, setViewMode] = useState<'dispatcher' | 'courier'>('dispatcher');
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [couriers, setCouriers] = useState<ApiCourier[]>([]);
  const [depot, setDepot] = useState<Depot>({
    latitude: 55.7558,
    longitude: 37.6173,
    address: 'Красная площадь, 1, Москва'
  });
  const [result, setResult] = useState<OptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatuses>({});
  const [dbConnected, setDbConnected] = useState(false);

  // Загрузка данных из БД при монтировании
  useEffect(() => {
    loadDataFromDatabase();
  }, []);

  // Проверка подключения к БД
  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  const checkDatabaseConnection = async () => {
    try {
      await api.getOrders();
      setDbConnected(true);
    } catch (error) {
      setDbConnected(false);
      message.warning('Не удалось подключиться к базе данных. Используются локальные данные.');
    }
  };

  // Загрузка заказов и курьеров из БД
  const loadDataFromDatabase = async () => {
    setDbLoading(true);
    
    try {
      const [ordersData, couriersData] = await Promise.all([
        api.getOrders(),
        api.getCouriers()
      ]);
      
      // Преобразуем заказы в расширенный формат
      const extendedOrders: ExtendedOrder[] = ordersData.map(order => ({
        ...order,
        _localStatus: order.status === 'delivered' ? 'delivered' : 'pending'
      }));
      
      setOrders(extendedOrders);
      setCouriers(couriersData);
      
      // Загружаем статусы доставок из БД
      const stats = await api.getDeliveryStats();
      const statusObj: DeliveryStatuses = {};
      ordersData.forEach(order => {
        statusObj[order.order_id || String(order.id)] = order.status as 'pending' | 'delivered';
      });
      setDeliveryStatuses(statusObj);
      
      if (ordersData.length > 0 || couriersData.length > 0) {
        message.success(`Загружено ${ordersData.length} заказов и ${couriersData.length} курьеров из БД`);
      }
    } catch (error) {
      console.error('Error loading data from database:', error);
      // При ошибке пробуем загрузить из localStorage как фоллбэк
      loadFromLocalStorage();
    } finally {
      setDbLoading(false);
    }
  };

  // Фоллбэк: загрузка из localStorage
  const loadFromLocalStorage = () => {
    const savedOrders = localStorage.getItem('app_orders');
    const savedCouriers = localStorage.getItem('app_couriers');
    const savedStatuses = localStorage.getItem('deliveryStatus');
    
    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders);
        setOrders(parsed.map((o: any) => ({ ...o, _localStatus: o.status || 'pending' })));
      } catch (e) {
        console.error('Error parsing saved orders:', e);
      }
    }
    
    if (savedCouriers) {
      try {
        setCouriers(JSON.parse(savedCouriers));
      } catch (e) {
        console.error('Error parsing saved couriers:', e);
      }
    }
    
    if (savedStatuses) {
      try {
        const statusData = JSON.parse(savedStatuses);
        const statusObj: DeliveryStatuses = {};
        if (statusData.points && Array.isArray(statusData.points)) {
          statusData.points.forEach((p: any) => {
            if (p.orderId && p.status) {
              statusObj[String(p.orderId)] = p.status;
            }
          });
          setDeliveryStatuses(statusObj);
        }
      } catch (e) {
        console.error('Error parsing delivery statuses:', e);
      }
    }
  };

  // Сохранение данных в БД (синхронизация)
  const syncToDatabase = useCallback(async () => {
    if (!dbConnected) return;
    
    try {
      // Синхронизируем заказы
      for (const order of orders) {
        if (order.id && order.order_id) {
          // Обновляем существующий заказ
          await api.updateOrder(order.order_id, {
            status: order._localStatus,
            latitude: order.latitude,
            longitude: order.longitude,
            address: order.address,
            ready_time: order.ready_time,
            deadline: order.deadline,
            weight: order.weight
          });
        }
      }
      
      // Синхронизируем статусы
      const statusData = {
        points: Object.entries(deliveryStatuses).map(([orderId, status]) => ({
          orderId,
          status
        })),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('deliveryStatus', JSON.stringify(statusData));
      
    } catch (error) {
      console.error('Error syncing to database:', error);
    }
  }, [orders, deliveryStatuses, dbConnected]);

  // Добавление нового заказа
  const handleAddOrder = async (newOrderData: Omit<ExtendedOrder, 'id' | 'order_id' | 'created_at'>) => {
    try {
      let savedOrder: ExtendedOrder;
      
      if (dbConnected) {
        // Сохраняем в БД
        const apiOrder = await api.createOrder({
          latitude: newOrderData.latitude,
          longitude: newOrderData.longitude,
          address: newOrderData.address,
          ready_time: newOrderData.ready_time,
          deadline: newOrderData.deadline,
          weight: newOrderData.weight
        });
        savedOrder = { ...apiOrder, _localStatus: 'pending' };
        message.success('Заказ сохранён в базе данных');
      } else {
        // Сохраняем локально
        savedOrder = {
          ...newOrderData,
          id: Date.now(),
          order_id: `local_${Date.now()}`,
          status: 'pending',
          created_at: new Date().toISOString(),
          _localStatus: 'pending'
        };
        message.info('Заказ сохранён локально (БД недоступна)');
      }
      
      setOrders([...orders, savedOrder]);
      
      // Сохраняем в localStorage как бэкап
      localStorage.setItem('app_orders', JSON.stringify(orders));
      
    } catch (error) {
      console.error('Error creating order:', error);
      message.error('Ошибка при сохранении заказа');
    }
  };

  // Обновление статуса доставки
  const handleDeliverOrder = async (orderId: string) => {
    try {
      // Обновляем локальный state
      const updatedOrders = orders.map(o => 
        o.order_id === orderId || String(o.id) === orderId
          ? { ...o, _localStatus: 'delivered' as const, status: 'delivered', delivered_at: new Date().toISOString() }
          : o
      );
      setOrders(updatedOrders);
      
      // Обновляем статусы
      setDeliveryStatuses(prev => ({
        ...prev,
        [orderId]: 'delivered'
      }));
      
      // Синхронизируем с БД
      if (dbConnected) {
        await api.updateOrder(orderId, {
          status: 'delivered',
          delivered_at: new Date().toISOString()
        });
        message.success('Доставка подтверждена и сохранена в БД');
      } else {
        message.success('Доставка подтверждена (локально)');
      }
      
      // Сохраняем бэкап
      localStorage.setItem('app_orders', JSON.stringify(updatedOrders));
      
    } catch (error) {
      console.error('Error updating delivery:', error);
      message.error('Ошибка при обновлении статуса');
    }
  };

  // Оптимизация маршрутов
  const handleOptimize = async () => {
    // Сбрасываем старые статусы
    setDeliveryStatuses({});
    
    const activeOrders = orders.filter(order => order._localStatus !== 'delivered');

    if (activeOrders.length === 0) {
      Modal.warning({
        title: 'Нет заказов для оптимизации',
        content: 'Добавьте хотя бы один заказ',
        okText: 'Понятно'
      });
      return;
    }

    if (couriers.length === 0) {
      message.warning('Добавьте хотя бы одного курьера');
      return;
    }

    setLoading(true);
    
    try {
      const request = {
        orders: activeOrders.map(o => ({
          latitude: o.latitude,
          longitude: o.longitude,
          address: o.address,
          ready_time: o.ready_time,
          deadline: o.deadline,
          weight: o.weight
        })),
        couriers: couriers.map(c => ({
          courier_id: c.id,
          courier_type: c.courier_type,
          capacity: c.capacity,
          speed_kmh: c.speed_kmh
        })),
        depot_latitude: depot.latitude,
        depot_longitude: depot.longitude
      };

      const response = await api.optimizeRoutes(request);
      setResult(response);
      
      const resultWithDepot = {
        ...response,
        depot_latitude: depot.latitude,
        depot_longitude: depot.longitude,
        depot_address: depot.address || 'Ресторан'
      };
      
      localStorage.setItem('optimizationResult', JSON.stringify(resultWithDepot));
      localStorage.setItem('optimizationTimestamp', new Date().toISOString());
      
      message.success(
        `Маршруты оптимизированы! Время: ${(response.computation_time_ms / 1000).toFixed(2)} сек`
      );
      
    } catch (error: any) {
      console.error('Optimization error:', error);
      
      // ✅ Безопасная обработка ошибки
      let errorMsg = 'Ошибка при оптимизации маршрутов';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        if (Array.isArray(detail)) {
          // Pydantic validation errors
          errorMsg = detail
            .map((d: any) => `${d.loc?.join('.')}: ${d.msg}`)
            .join('; ')
            .slice(0, 200);
        } else if (typeof detail === 'string') {
          errorMsg = detail.slice(0, 200);
        } else if (typeof detail === 'object') {
          errorMsg = JSON.stringify(detail).slice(0, 200);
        }
      }
      
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Очистка всех данных
  const handleClearAll = () => {
    Modal.confirm({
      title: 'Очистить все данные?',
      content: (
        <div>
          <p>Будут удалены:</p>
          <ul style={{ textAlign: 'left', marginLeft: 20 }}>
            <li>Все заказы ({orders.length})</li>
            <li>Все курьеры ({couriers.length})</li>
            <li>Результаты оптимизации</li>
            <li>Статусы доставок</li>
          </ul>
          {dbConnected && <p style={{ color: '#fa8c16', marginTop: 8 }}>Данные также будут удалены из базы данных</p>}
        </div>
      ),
      okText: 'Да, очистить всё',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        setOrders([]);
        setCouriers([]);
        setResult(null);
        setDeliveryStatuses({});
        
        if (dbConnected) {
          try {
            for (const order of orders) {
              if (order.order_id) {
                await api.deleteOrder(order.order_id);
              }
            }
            message.success('Данные удалены из базы данных');
          } catch (error) {
            console.error('Error clearing database:', error);
          }
        }
        
        // Очистка localStorage
        localStorage.removeItem('optimizationResult');
        localStorage.removeItem('optimizationTimestamp');
        localStorage.removeItem('deliveryStatus');
        localStorage.removeItem('app_orders');
        localStorage.removeItem('app_couriers');
        
        message.info('Все данные очищены');
      }
    });
  };

  const handleClearDeliveredOrders = () => {
    const deliveredIds = Object.keys(deliveryStatuses)
      .filter(id => deliveryStatuses[id] === 'delivered');

    if (deliveredIds.length === 0) {
      message.info('Нет доставленных заказов для очистки');
      return;
    }

    Modal.confirm({
      title: `Удалить ${deliveredIds.length} доставленных заказов?`,
      content: 'Эти заказы будут удалены из списка и базы данных',
      okText: 'Да, удалить',
      cancelText: 'Отмена',
      onOk: async () => {
        const newOrders = orders.filter(o => {
          const orderId = o.order_id || String(o.id);
          return !deliveredIds.includes(orderId);
        });
        setOrders(newOrders);
        
        // Удаляем из БД
        if (dbConnected) {
          for (const orderId of deliveredIds) {
            try {
              await api.deleteOrder(orderId);
            } catch (error) {
              console.error(`Error deleting order ${orderId}:`, error);
            }
          }
        }
        
        // Обновляем статусы
        const newStatuses = { ...deliveryStatuses };
        deliveredIds.forEach(id => delete newStatuses[id]);
        setDeliveryStatuses(newStatuses);
        
        // Бэкап
        localStorage.setItem('app_orders', JSON.stringify(newOrders));
        
        message.success(`Удалено ${deliveredIds.length} доставленных заказов`);
      }
    });
  };

  // Переключение в режим диспетчера из курьера
  useEffect(() => {
    const switchFlag = localStorage.getItem('switchToDispatcher');
    if (switchFlag === 'true') {
      localStorage.removeItem('switchToDispatcher');
      setViewMode('dispatcher');
      loadDataFromDatabase(); // Перезагружаем данные
    }
  }, []);

  // Автосохранение в БД при изменении данных
  useEffect(() => {
    if (dbConnected && orders.length > 0) {
      const timer = setTimeout(() => {
        syncToDatabase();
      }, 2000); // Debounce 2 секунды
      return () => clearTimeout(timer);
    }
  }, [orders, deliveryStatuses, dbConnected, syncToDatabase]);

  // Статистика для отображения
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o._localStatus !== 'delivered').length,
    delivered: orders.filter(o => o._localStatus === 'delivered').length
  };

  // Если режим курьера — показываем отдельный интерфейс
  if (viewMode === 'courier') {
    return <CourierInterface />;
  }

  return (
    <Layout className="app-container">
      <Header />
      
      {/* Панель режима и статуса БД */}
      <div style={{ 
        background: '#fff', 
        padding: '12px 24px',
        borderBottom: '1px solid #e8e8e8',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Text strong style={{ fontSize: '14px' }}>
            <EnvironmentOutlined /> Режим: Диспетчер
          </Text>
          
          {/* Индикатор подключения к БД */}
          <Tag 
            color={dbConnected ? 'green' : 'orange'} 
            icon={dbConnected ? <DatabaseOutlined /> : <SyncOutlined spin />}
          >
            {dbConnected ? 'БД: подключено' : 'БД: оффлайн'}
          </Tag>
          
          {dbLoading && (
            <Tag color="blue" icon={<SyncOutlined spin />}>
              Загрузка...
            </Tag>
          )}
        </div>
        
        <Radio.Group 
          value={viewMode} 
          onChange={(e) => setViewMode(e.target.value)}
          size="large"
        >
          <Radio.Button value="dispatcher">
            <RocketOutlined /> Диспетчер
          </Radio.Button>
          <Radio.Button value="courier">
            <UserOutlined /> Курьер
          </Radio.Button>
        </Radio.Group>
      </div>

      <Layout className="main-content">
        <Sider width={480} theme="light" className="sidebar">
          <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
            
            {/* Статистика заказов */}
            <div style={{ 
              padding: '12px 16px', 
              background: '#f0f5ff', 
              borderRadius: '8px', 
              marginBottom: '16px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Text strong>📊 Статистика заказов</Text>
                {dbConnected && <DatabaseOutlined style={{ color: '#52c41a' }} />}
              </div>
              <Progress 
                percent={stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0}
                format={() => (
                  <span style={{ fontSize: '13px' }}>
                    {stats.delivered} из {stats.total} доставлено
                  </span>
                )}
                strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
              />
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px' }}>
                <Tag color="blue">⏳ {stats.pending} ожидает</Tag>
                <Tag color="green">✓ {stats.delivered} доставлено</Tag>
              </div>
            </div>
            
            <WeatherWidget latitude={depot.latitude} longitude={depot.longitude} />
            
            <ObstaclesWidget 
              latitude={depot.latitude} 
              longitude={depot.longitude}
              onObstacleAdded={() => message.info('Препятствие учтено при оптимизации')}
            />
            
            <DepotForm depot={depot} setDepot={setDepot} />
            
            <OrderForm 
              orders={orders} 
              setOrders={setOrders}
              onAddOrder={handleAddOrder}
              onDeliverOrder={handleDeliverOrder}
              deliveryStatuses={deliveryStatuses}
            />
            
            <CourierForm couriers={couriers} setCouriers={setCouriers} />
            
            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
              <Button 
                type="primary" 
                size="large"
                className="optimize-btn"
                icon={<RocketOutlined />}
                onClick={handleOptimize}
                loading={loading}
                disabled={orders.length === 0 || couriers.length === 0}
                style={{ 
                  width: '100%', 
                  height: '48px', 
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}
              >
                🚀 Оптимизировать маршруты
              </Button>
              
              {stats.delivered > 0 && (
                <Button 
                  size="large"
                  className="optimize-btn"
                  icon={<ClearOutlined />}
                  onClick={handleClearDeliveredOrders}
                  style={{ 
                    width: '100%', 
                    height: '48px',
                    fontSize: '16px',
                    marginBottom: '8px'
                  }}
                >
                  🗑️ Очистить доставленные ({stats.delivered})
                </Button>
              )}
              
              <Button 
                size="large"
                className="optimize-btn"
                icon={<ClearOutlined />}
                onClick={handleClearAll}
                danger
                style={{ 
                  width: '100%', 
                  height: '48px',
                  fontSize: '16px'
                }}
              >
                Очистить всё
              </Button>
              
              {dbConnected && (
                <Button 
                  size="middle"
                  icon={<SyncOutlined />}
                  onClick={syncToDatabase}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Синхронизировать с БД
                </Button>
              )}
            </div>

            <Stats result={result} loading={loading} />
            
            {result && <RouteList routes={result.routes} />}
            
            <div style={{ 
              marginTop: '24px', 
              padding: '12px', 
              background: '#f5f5f5', 
              borderRadius: '8px',
              fontSize: '12px',
              color: '#999',
              textAlign: 'center'
            }}>
              <Text>
                🎓 Дипломный проект МАИ, 2026
              </Text>
            </div>
          </div>
        </Sider>
        
        <Content className="map-container">
          {(loading || dbLoading) ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              background: 'rgba(255,255,255,0.9)',
              zIndex: 1000,
              position: 'relative'
            }}>
              <div style={{ textAlign: 'center' }}>
                <Spin size="large" tip={loading ? "Оптимизация маршрутов..." : "Загрузка данных из БД..."} />
                <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                  {loading && 'Учитываются: погода, трафик, препятствия'}
                  {dbLoading && !loading && 'Синхронизация с базой данных...'}
                </div>
              </div>
            </div>
          ) : (
            <Map orders={orders} routes={result?.routes || []} depot={depot} />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;