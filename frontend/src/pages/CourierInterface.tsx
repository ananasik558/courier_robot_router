// frontend/src/pages/CourierInterface.tsx

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Button, Card, Statistic, message, Modal, Tag, Select, Alert, Result, Progress } from 'antd';
import { 
  EnvironmentOutlined, 
  CheckCircleOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  HomeOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  LogoutOutlined,
  TrophyOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Интерфейсы
interface DeliveryPoint {
  id: number;
  orderId: number;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  status: 'pending' | 'delivered';
  estimatedTime?: string;
  arrivalTime?: string;
}

interface CourierRoute {
  courierId: number;
  courierType: string;
  points: DeliveryPoint[];
  totalDistanceM: number;
  totalTimeMin: number;
  ordersCount: number;
}

interface CourierLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface Depot {
  latitude: number;
  longitude: number;
  address?: string;
}

interface OptimizationResult {
  routes: Array<{
    courier_id: number;
    courier_type: string;
    points: Array<{
      order_id: number;
      latitude: number;
      longitude: number;
      arrival_time: string;
      departure_time: string;
    }>;
    total_distance_m: number;
    total_time_min: number;
    orders_count: number;
  }>;
  total_time_min: number;
  total_distance_m: number;
  computation_time_ms: number;
  depot_latitude?: number;
  depot_longitude?: number;
  depot_address?: string;
}

interface DeliveryStatus {
  courierId: number;
  points: Array<{
    orderId: number;
    status: 'pending' | 'delivered';
  }>;
  timestamp: string;
}

const CourierInterface: React.FC = () => {
  // State
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [courierRoutes, setCourierRoutes] = useState<CourierRoute[]>([]);
  const [courierLocation, setCourierLocation] = useState<CourierLocation | null>(null);
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [depot, setDepot] = useState<Depot | null>(null);
  const [isReturningToDepot, setIsReturningToDepot] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shiftCompleted, setShiftCompleted] = useState(false);
  const [shiftStats, setShiftStats] = useState({
    completedDeliveries: 0,
    totalDeliveries: 0,
    completedAt: '',
    courierId: 0
  });

  useEffect(() => {
    loadOptimizationData();
  }, []);

  useEffect(() => {
    if (deliveryPoints.length > 0 && !watchId && !shiftCompleted) {
      startTracking();
    }
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [deliveryPoints, shiftCompleted]);

  useEffect(() => {
    if (courierLocation && !shiftCompleted) {
      calculateRoute();
    }
  }, [courierLocation, currentPointIndex, deliveryPoints, isReturningToDepot, shiftCompleted]);

  const loadOptimizationData = () => {
    setIsLoading(true);
    
    try {
      const savedResult = localStorage.getItem('optimizationResult');
      const savedTimestamp = localStorage.getItem('optimizationTimestamp');
      
      if (!savedResult) {
        message.warning('Нет данных оптимизации. Сначала оптимизируйте маршруты в режиме диспетчера.');
        setIsLoading(false);
        return;
      }

      if (savedTimestamp) {
        const timestamp = new Date(savedTimestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 2) {
          Modal.warning({
            title: 'Данные устарели',
            content: 'Данные оптимизации старше 2 часов. Пожалуйста, выполните оптимизацию заново.',
            onOk: () => {
              localStorage.removeItem('optimizationResult');
              localStorage.removeItem('optimizationTimestamp');
              setIsLoading(false);
            }
          });
          return;
        }
      }

      const result: OptimizationResult = JSON.parse(savedResult);
      
      if (result.depot_latitude && result.depot_longitude) {
        setDepot({
          latitude: result.depot_latitude,
          longitude: result.depot_longitude,
          address: result.depot_address || 'Ресторан (Депо)'
        });
      }
      
      const routes: CourierRoute[] = result.routes.map((route) => ({
        courierId: route.courier_id,
        courierType: route.courier_type || 'bicycle',
        points: route.points.map((p, index) => ({
          id: index + 1,
          orderId: p.order_id,
          address: '',
          latitude: p.latitude,
          longitude: p.longitude,
          phone: '',
          status: 'pending' as const,
          estimatedTime: new Date(p.arrival_time).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          arrivalTime: p.arrival_time
        })),
        totalDistanceM: route.total_distance_m,
        totalTimeMin: route.total_time_min,
        ordersCount: route.orders_count
      }));

      setCourierRoutes(routes);
      
      if (routes.length > 0) {
        const firstCourierId = routes[0].courierId;
        setSelectedCourierId(firstCourierId);
        loadCourierDeliveries(firstCourierId, routes);
      }
      
    } catch (error) {
      console.error('Error loading optimization data:', error);
      message.error('Ошибка загрузки данных оптимизации');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourierDeliveries = (courierId: number, routes: CourierRoute[] = courierRoutes) => {
    const route = routes.find(r => r.courierId === courierId);
    
    if (!route) {
      message.warning('Маршрут для этого курьера не найден');
      return;
    }

    // ✅ ЗАГРУЖАЕМ СОХРАНЕННЫЕ СТАТУСЫ ИЗ LOCALSTORAGE
    const savedStatus = localStorage.getItem('deliveryStatus');
    let points = route.points;
    
    if (savedStatus) {
      try {
        const statusData: DeliveryStatus = JSON.parse(savedStatus);
        if (statusData.courierId === courierId) {
          points = route.points.map(p => {
            const savedPoint = statusData.points.find((sp) => sp.orderId === p.orderId);
            return savedPoint ? { ...p, status: savedPoint.status } : p;
          });
        }
      } catch (error) {
        console.error('Error loading delivery status:', error);
      }
    }

    setDeliveryPoints(points);
    setCurrentPointIndex(0);
    setIsReturningToDepot(false);
    setRouteGeometry([]);
    setShiftCompleted(false);
    
    const deliveredCount = points.filter(p => p.status === 'delivered').length;
    message.success(`Загружено ${points.length} доставок (${deliveredCount} выполнено) для курьера #${courierId}`);
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      message.error('Геолокация не поддерживается вашим браузером');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setCourierLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsTracking(true);
      },
      (error) => {
        console.error('Geolocation error:', error);
        message.error('Не удалось определить местоположение.');
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  };

  const calculateRoute = async () => {
    if (!courierLocation || shiftCompleted) return;

    let targetPoint: { longitude: number; latitude: number } | null = null;

    if (isReturningToDepot && depot) {
      targetPoint = {
        longitude: depot.longitude,
        latitude: depot.latitude
      };
    } else if (deliveryPoints.length > 0) {
      const currentPoint = deliveryPoints[currentPointIndex];
      if (currentPoint && currentPoint.status === 'pending') {
        targetPoint = {
          longitude: currentPoint.longitude,
          latitude: currentPoint.latitude
        };
      }
    }

    if (!targetPoint) {
      setRouteGeometry([]);
      return;
    }

    const coordinates = [
      `${courierLocation.longitude},${courierLocation.latitude}`,
      `${targetPoint.longitude},${targetPoint.latitude}`
    ].join(';');

    try {
      const profile = courierRoutes.find(r => r.courierId === selectedCourierId)?.courierType || 'bicycle';
      const response = await fetch(
        `/api/route/geometry?coordinates=${coordinates}&profile=${profile}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]?.geometry?.coordinates) {
        const route = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [
          coord[1],
          coord[0]
        ]);
        setRouteGeometry(route);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    }
  };

  const handleDeliver = (pointId: number) => {
    const currentPoint = deliveryPoints.find(p => p.id === pointId);
    
    Modal.confirm({
      title: 'Подтверждение доставки',
      content: (
        <div>
          <p>Заказ #{currentPoint?.orderId}</p>
          <p><strong>{currentPoint?.address || `Точка ${currentPointIndex + 1}`}</strong></p>
          <p>Заказ доставлен клиенту?</p>
        </div>
      ),
      okText: 'Да, доставлен',
      cancelText: 'Отмена',
      okType: 'success',
      onOk: () => {
        const updatedPoints = deliveryPoints.map(p =>
          p.id === pointId ? { ...p, status: 'delivered' as const } : p
        );
        
        setDeliveryPoints(updatedPoints);
        
        // ✅ СОХРАНЯЕМ СТАТУСЫ В LOCALSTORAGE ДЛЯ СИНХРОНИЗАЦИИ
        const deliveryStatus: DeliveryStatus = {
          courierId: selectedCourierId || 0,
          points: updatedPoints.map(p => ({
            orderId: p.orderId,
            status: p.status
          })),
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('deliveryStatus', JSON.stringify(deliveryStatus));
        
        // Уведомляем другие вкладки об изменении
        window.dispatchEvent(new Event('storage'));
        
        message.success('Доставка подтверждена! 🎉');
        
        const currentIndex = deliveryPoints.findIndex(p => p.id === pointId);
        if (currentIndex === deliveryPoints.length - 1) {
          setTimeout(() => {
            setIsReturningToDepot(true);
            message.info('🏪 Все доставки выполнены! Возвращайтесь в депо.', 5);
          }, 500);
        } else {
          setCurrentPointIndex(currentIndex + 1);
        }
      }
    });
  };

  const handleReturnToDepotComplete = () => {
    const completedDeliveries = deliveryPoints.filter(p => p.status === 'delivered').length;
    
    Modal.confirm({
      title: '🏪 Завершение смены',
      content: (
        <div style={{ textAlign: 'left' }}>
          <p>Вы подтверждаете возврат в депо и завершение смены?</p>
          <div style={{ 
            padding: '12px', 
            background: '#f6ffed', 
            borderRadius: '8px',
            marginTop: '12px'
          }}>
            <p style={{ margin: '4px 0', fontSize: '16px' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              <strong>Выполнено доставок:</strong> {completedDeliveries} из {deliveryPoints.length}
            </p>
            <p style={{ margin: '4px 0' }}>
              <ClockCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
              <strong>Время:</strong> {new Date().toLocaleTimeString('ru-RU')}
            </p>
          </div>
          <Alert
            message="Данные сохранены"
            description="Прогресс доставок сохранён и виден в режиме диспетчера."
            type="info"
            showIcon
            style={{ marginTop: '12px' }}
          />
        </div>
      ),
      okText: 'Да, завершить смену',
      cancelText: 'Отмена',
      okType: 'success',
      onOk: () => {
        setShiftStats({
          completedDeliveries,
          totalDeliveries: deliveryPoints.length,
          completedAt: new Date().toLocaleString('ru-RU'),
          courierId: selectedCourierId || 0
        });
        
        setDeliveryPoints([]);
        setCurrentPointIndex(0);
        setIsReturningToDepot(false);
        setRouteGeometry([]);
        setShiftCompleted(true);
        
        message.success('Смена завершена! Данные сохранены. 👋');
      }
    });
  };

  const handleStartNewShift = () => {
    Modal.confirm({
      title: '🚀 Новая смена',
      content: 'Текущие данные будут очищены. Загрузить новую оптимизацию из режима диспетчера?',
      okText: 'Да, начать новую смену',
      cancelText: 'Отмена',
      onOk: () => {
        localStorage.removeItem('optimizationResult');
        localStorage.removeItem('optimizationTimestamp');
        localStorage.removeItem('deliveryStatus');
        
        setShiftCompleted(false);
        setDeliveryPoints([]);
        setCourierRoutes([]);
        setRouteGeometry([]);
        setShiftStats({ 
          completedDeliveries: 0, 
          totalDeliveries: 0, 
          completedAt: '', 
          courierId: 0 
        });
        
        loadOptimizationData();
      }
    });
  };

  const handleClearData = () => {
    Modal.confirm({
      title: '🗑️ Очистить все данные?',
      content: 'Это действие нельзя отменить. Данные оптимизации и статусы доставок будут удалены.',
      okText: 'Да, очистить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => {
        localStorage.removeItem('optimizationResult');
        localStorage.removeItem('optimizationTimestamp');
        localStorage.removeItem('deliveryStatus');
        window.location.reload();
      }
    });
  };

  const handleCourierChange = (courierId: number) => {
    setSelectedCourierId(courierId);
    loadCourierDeliveries(courierId);
  };

  const completedPoints = deliveryPoints.filter(p => p.status === 'delivered').length;
  const totalPoints = deliveryPoints.length;
  const allDelivered = totalPoints > 0 && completedPoints === totalPoints;
  const currentPoint = !isReturningToDepot ? deliveryPoints[currentPointIndex] : null;
  const completionPercentage = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;

  const courierIcon = L.divIcon({
    className: 'courier-marker',
    html: `<div style="
      background-color: #1890ff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    </style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const deliveryIcon = (status: string, isCurrent: boolean) => L.divIcon({
    className: 'delivery-marker',
    html: `<div style="
      background-color: ${status === 'delivered' ? '#52c41a' : isCurrent ? '#fa8c16' : '#d9d9d9'};
      width: ${isCurrent ? '36' : '32'}px;
      height: ${isCurrent ? '36' : '32'}px;
      border-radius: 50%;
      border: ${isCurrent ? '4px' : '3px'} solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${isCurrent ? '18' : '16'}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ${isCurrent ? 'animation: bounce 1s infinite;' : ''}
    ">${status === 'delivered' ? '✓' : '📦'}</div>
    <style>
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
    </style>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  const depotIcon = L.divIcon({
    className: 'depot-marker',
    html: `<div style="
      background-color: ${isReturningToDepot ? '#52c41a' : '#722ed1'};
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 4px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ${isReturningToDepot ? 'animation: pulse 1.5s infinite;' : ''}
    ">🏪</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  // ЭКРАН ЗАВЕРШЕНИЯ СМЕНЫ
  if (shiftCompleted) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
        padding: '20px'
      }}>
        <Card style={{ width: '100%', maxWidth: 600, textAlign: 'center', padding: 40, borderRadius: 16 }}>
          <Result
            status="success"
            icon={<TrophyOutlined style={{ color: '#faad14', fontSize: 80 }} />}
            title={<span style={{ fontSize: 28 }}>Смена завершена успешно!</span>}
            subTitle={
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Alert
                  message="✅ Все заказы выполнены"
                  description="Прогресс синхронизирован с режимом диспетчера"
                  type="success"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
                
                <div style={{ 
                  padding: '24px', 
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  borderRadius: '12px',
                  textAlign: 'left',
                  marginTop: 16
                }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#389e0d' }}>📊 Итоги смены</h3>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Progress
                      percent={100}
                      status="success"
                      format={() => (
                        <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                          {shiftStats.completedDeliveries} / {shiftStats.totalDeliveries} доставок
                        </span>
                      )}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ 
                      padding: '12px', 
                      background: 'white',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                      <div>
                        <div style={{ fontSize: 12, color: '#999' }}>Выполнено</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                          {shiftStats.completedDeliveries} заказов
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: '12px', 
                      background: 'white',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <ClockCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                      <div>
                        <div style={{ fontSize: 12, color: '#999' }}>Завершено в</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                          {shiftStats.completedAt}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: '12px', 
                      background: 'white',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <HomeOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                      <div>
                        <div style={{ fontSize: 12, color: '#999' }}>Курьер</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                          #{shiftStats.courierId}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
            extra={[
              <Button 
                type="primary" 
                size="large"
                key="new-shift"
                onClick={handleStartNewShift}
                icon={<ReloadOutlined />}
                style={{ marginRight: 12, padding: '0 32px', height: 48, fontSize: 16 }}
              >
                Начать новую смену
              </Button>,
              <Button 
                size="large"
                key="dispatcher"
                onClick={() => {
                  localStorage.setItem('switchToDispatcher', 'true');
                  window.location.reload();
                }}
                icon={<LogoutOutlined />}
                style={{ padding: '0 32px', height: 48, fontSize: 16, marginRight: 12 }}
              >
                В режим диспетчера
              </Button>,
              <Button 
                danger
                size="large"
                key="clear-data"
                onClick={handleClearData}
                icon={<DeleteOutlined />}
                style={{ padding: '0 32px', height: 48, fontSize: 16 }}
              >
                Очистить данные
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  // Экран загрузки
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ width: 400, textAlign: 'center' }}>
          <RocketOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} spin />
          <h2>Загрузка данных...</h2>
          <p style={{ color: '#666' }}>Получение маршрута курьера</p>
        </Card>
      </div>
    );
  }

  // Экран отсутствия данных
  if (courierRoutes.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#f0f2f5'
      }}>
        <Card style={{ width: 450, textAlign: 'center', padding: 32 }}>
          <ExclamationCircleOutlined style={{ fontSize: 64, color: '#faad14', marginBottom: 24 }} />
          <h2>Нет данных оптимизации</h2>
          <p style={{ color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
            Сначала выполните оптимизацию маршрутов в режиме диспетчера.
          </p>
          <Button 
            type="primary" 
            size="large"
            onClick={() => window.location.reload()}
            icon={<RocketOutlined />}
          >
            Обновить страницу
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      background: '#f0f2f5'
    }}>
      {/* Header */}
      <div style={{
        background: isReturningToDepot 
          ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' 
          : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
        color: 'white',
        padding: '16px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'background 0.3s ease'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>
          {isReturningToDepot ? '🏪' : '🚴'} Интерфейс курьера #{selectedCourierId}
        </h2>
        <div style={{ marginTop: '8px', fontSize: '14px', opacity: 0.95 }}>
          {isTracking ? (
            <span>📍 Отслеживание активно</span>
          ) : (
            <span style={{ color: '#ffd666' }}>⚠️ Отслеживание отключено</span>
          )}
          {isReturningToDepot && (
            <span style={{ 
              marginLeft: '12px', 
              padding: '2px 8px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>
              🏪 ВОЗВРАТ В ДЕПО
            </span>
          )}
        </div>
        
        {courierRoutes.length > 1 && (
          <div style={{ marginTop: '12px' }}>
            <Select
              value={selectedCourierId || undefined}
              onChange={handleCourierChange}
              style={{ width: 250 }}
              size="middle"
              disabled={isReturningToDepot || shiftCompleted}
            >
              {courierRoutes.map(route => (
                <Select.Option key={route.courierId} value={route.courierId}>
                  {route.courierType === 'bicycle' ? '🚴' : '🚶'} Курьер #{route.courierId} ({route.ordersCount})
                </Select.Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ 
        padding: '16px',
        background: 'white',
        borderBottom: '1px solid #e8e8e8',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ marginBottom: 12 }}>
          <Progress
            percent={completionPercentage}
            status={allDelivered ? 'success' : 'active'}
            format={(percent) => (
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>
                {completedPoints} из {totalPoints} доставлено ({Math.round(percent)}%)
              </span>
            )}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#f6ffed', borderRadius: 8 }}>
            <Statistic
              title="Выполнено"
              value={completedPoints}
              suffix={`/ ${totalPoints}`}
              valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
            />
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#e6f7ff', borderRadius: 8 }}>
            <Statistic
              title="Точность GPS"
              value={courierLocation?.accuracy ? Math.round(courierLocation.accuracy) : '-'}
              suffix="м"
              valueStyle={{ fontSize: '24px' }}
            />
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: isReturningToDepot ? '#fff7e6' : '#f0f5ff', borderRadius: 8 }}>
            <Statistic
              title={isReturningToDepot ? 'До депо' : 'Всего'}
              value={isReturningToDepot 
                ? Math.round((depot ? Math.sqrt(
                    Math.pow(depot.latitude - (courierLocation?.latitude || 0), 2) +
                    Math.pow(depot.longitude - (courierLocation?.longitude || 0), 2)
                  ) * 111000 : 0)) / 1000
                : Math.round((courierRoutes.find(r => r.courierId === selectedCourierId)?.totalDistanceM || 0) / 1000 * 10) / 10
              }
              suffix="км"
              valueStyle={{ fontSize: '24px' }}
            />
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {courierLocation ? (
          <MapContainer
            center={[courierLocation.latitude, courierLocation.longitude]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={[courierLocation.latitude, courierLocation.longitude]} icon={courierIcon} zIndexOffset={1000}>
              <Popup>🚴 Вы здесь</Popup>
            </Marker>

            {depot && (
              <Marker position={[depot.latitude, depot.longitude]} icon={depotIcon} zIndexOffset={900}>
                <Popup>🏪 Ресторан (Депо)</Popup>
              </Marker>
            )}

            {deliveryPoints.map((point, index) => {
              const isCurrent = index === currentPointIndex && !isReturningToDepot;
              return (
                <Marker
                  key={point.id}
                  position={[point.latitude, point.longitude]}
                  icon={deliveryIcon(point.status, isCurrent)}
                  zIndexOffset={isCurrent ? 800 : 100}
                >
                  <Popup>
                    <div>
                      <strong>Заказ #{point.orderId}</strong><br />
                      {point.estimatedTime && <div>🕐 {point.estimatedTime}</div>}
                      <Tag color={point.status === 'delivered' ? 'green' : 'orange'}>
                        {point.status === 'delivered' ? '✓ Доставлен' : '📦 Ожидает'}
                      </Tag>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {routeGeometry.length > 0 && (
              <Polyline
                positions={routeGeometry}
                pathOptions={{ 
                  color: isReturningToDepot ? '#52c41a' : '#1890ff',
                  weight: isReturningToDepot ? 6 : 5,
                  opacity: 0.9,
                  dashArray: isReturningToDepot ? '8, 8' : '12, 12'
                }}
              />
            )}
          </MapContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f2f5' }}>
            <div style={{ textAlign: 'center' }}>
              <EnvironmentOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }} spin />
              <p style={{ fontSize: '18px', color: '#666' }}>Определение местоположения...</p>
            </div>
          </div>
        )}
      </div>

      {/* Current delivery info */}
      {(currentPoint || isReturningToDepot) && (
        <Card 
          style={{
            margin: '12px',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
            background: isReturningToDepot ? 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' : '#fff',
            border: isReturningToDepot ? '2px solid #52c41a' : 'none',
            borderRadius: '12px'
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: isReturningToDepot ? '#389e0d' : '#000', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isReturningToDepot ? (
              <><HomeOutlined /> Возврат в депо</>
            ) : (
              <><EnvironmentOutlined style={{ color: '#fa8c16' }} /> Доставка #{currentPoint?.orderId}</>
            )}
          </h3>
          
          <p style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
            {isReturningToDepot ? (depot?.address || 'Ресторан') : (currentPoint?.address || `Точка ${currentPointIndex + 1}`)}
          </p>
          
          {isReturningToDepot ? (
            <Alert
              message="✅ Все доставки выполнены!"
              description="Отличная работа! Вернитесь в ресторан для завершения смены."
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          ) : (
            <>
              {currentPoint?.estimatedTime && (
                <div style={{ marginBottom: '12px' }}>
                  <ClockCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                  Время: <strong>{currentPoint.estimatedTime}</strong>
                </div>
              )}
              {currentPoint?.phone && (
                <div style={{ marginBottom: '16px' }}>
                  <PhoneOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  {currentPoint.phone}
                </div>
              )}
            </>
          )}

          {!isReturningToDepot && currentPoint && (
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={() => handleDeliver(currentPoint.id)}
              style={{ width: '100%', height: '48px', fontSize: '16px' }}
            >
              Подтвердить доставку
            </Button>
          )}

          {isReturningToDepot && (
            <Button
              type="success"
              size="large"
              icon={<HomeOutlined />}
              onClick={handleReturnToDepotComplete}
              style={{ width: '100%', height: '48px', fontSize: '16px', background: '#52c41a', borderColor: '#52c41a' }}
            >
              Завершить смену
            </Button>
          )}
        </Card>
      )}

      {/* Delivery list */}
      {deliveryPoints.length > 0 && (
        <Card 
          title={`Доставки (${completedPoints}/${totalPoints})`}
          style={{ margin: '0 12px 12px 12px', borderRadius: '12px' }}
          bodyStyle={{ maxHeight: '200px', overflowY: 'auto', padding: '12px' }}
        >
          {deliveryPoints.map((point, index) => (
            <div 
              key={point.id}
              style={{
                padding: '12px',
                marginBottom: index < deliveryPoints.length - 1 ? '8px' : '0',
                background: point.status === 'delivered' ? '#f6ffed' : index === currentPointIndex ? '#e6f7ff' : '#fff',
                border: index === currentPointIndex ? '2px solid #1890ff' : '1px solid #e8e8e8',
                borderRadius: '8px',
                opacity: point.status === 'delivered' ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Заказ #{point.orderId}</strong>
                  <div style={{ fontSize: '13px', color: '#666' }}>{point.estimatedTime}</div>
                </div>
                <Tag color={point.status === 'delivered' ? 'green' : index === currentPointIndex ? 'blue' : 'default'}>
                  {point.status === 'delivered' ? '✓ Доставлен' : index === currentPointIndex ? '→ Сейчас' : '⏳ Ожидает'}
                </Tag>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default CourierInterface;