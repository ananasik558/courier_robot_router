// frontend/src/components/RouteList.tsx

import React, { useState, useEffect } from 'react';
import { Typography, Tag, Card, Progress } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { OptimizedRoute } from '../types';
import { formatDistance, formatDuration, formatTime } from '../utils/helpers';

const { Text } = Typography;

interface DeliveryStatus {
  courierId: number;
  points: Array<{
    orderId: number;
    status: 'pending' | 'delivered';
  }>;
  timestamp: string;
}

interface RouteListProps {
  routes: OptimizedRoute[];
}

const RouteList: React.FC<RouteListProps> = ({ routes }) => {
  const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatus | null>(null);

  // Загружаем статусы доставок из localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem('deliveryStatus');
    if (savedStatus) {
      try {
        setDeliveryStatuses(JSON.parse(savedStatus));
      } catch (error) {
        console.error('Error parsing delivery status:', error);
      }
    }

    // Слушаем изменения в localStorage (для обновления в реальном времени)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'deliveryStatus') {
        if (e.newValue) {
          setDeliveryStatuses(JSON.parse(e.newValue));
        } else {
          setDeliveryStatuses(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (routes.length === 0) {
    return null;
  }

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

  const getDeliveredCount = (route: OptimizedRoute) => {
    if (!deliveryStatuses || deliveryStatuses.courierId !== route.courier_id) {
      return 0;
    }
    return deliveryStatuses.points.filter(p => p.status === 'delivered').length;
  };

  const getPointStatus = (route: OptimizedRoute, orderId: number): 'pending' | 'delivered' => {
    if (!deliveryStatuses || deliveryStatuses.courierId !== route.courier_id) {
      return 'pending';
    }
    const point = deliveryStatuses.points.find(p => p.orderId === orderId);
    return point?.status || 'pending';
  };

  return (
    <div className="form-section">
      <div className="section-title">🗺️ Оптимизированные маршруты</div>
      
      {routes.map((route, index) => {
        const deliveredCount = getDeliveredCount(route);
        const totalOrders = route.orders_count;
        const progressPercent = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;
        const isCompleted = deliveredCount === totalOrders && totalOrders > 0;

        return (
          <Card 
            key={route.courier_id} 
            className={`route-card ${isCompleted ? 'completed' : ''}`}
            style={{
              border: isCompleted ? '2px solid #52c41a' : '2px solid #e8e8e8',
              background: isCompleted ? 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' : '#fff',
              marginBottom: '16px',
              borderRadius: '12px',
              boxShadow: isCompleted ? '0 4px 12px rgba(82, 196, 26, 0.15)' : '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <div className="route-header" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="route-number" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {isCompleted ? '✅' : '🚴'} Курьер #{route.courier_id}
                </div>
                {isCompleted && (
                  <Tag color="green" style={{ fontSize: '13px', padding: '4px 12px' }}>
                    <CheckCircleOutlined /> Завершён
                  </Tag>
                )}
              </div>
              <Tag 
                color={isCompleted ? 'green' : colors[index % colors.length]}
                style={{ fontSize: '13px', padding: '4px 12px' }}
              >
                {deliveredCount} / {route.orders_count} доставлено
              </Tag>
            </div>
            
            {/* Progress bar */}
            <div style={{ marginBottom: '12px' }}>
              <Progress
                percent={Math.round(progressPercent)}
                status={isCompleted ? 'success' : 'active'}
                strokeColor={{
                  '0%': isCompleted ? '#52c41a' : '#1890ff',
                  '100%': isCompleted ? '#73d13d' : '#40a9ff',
                }}
                format={(percent) => (
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    {percent}% выполнено
                  </span>
                )}
              />
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '8px', 
              marginBottom: '12px' 
            }}>
              <div style={{ 
                padding: '8px', 
                background: isCompleted ? '#fff' : '#f0f5ff',
                borderRadius: '6px' 
              }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>📏 Расстояние</Text>
                <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  {formatDistance(route.total_distance_m)}
                </div>
              </div>
              <div style={{ 
                padding: '8px', 
                background: isCompleted ? '#fff' : '#f6ffed',
                borderRadius: '6px' 
              }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>⏱️ Время</Text>
                <div style={{ fontWeight: 'bold', color: '#52c41a' }}>
                  {formatDuration(route.total_time_min)}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '12px',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                <EnvironmentOutlined style={{ color: '#fa8c16' }} />
                Порядок доставки:
              </div>
              
              {route.points.map((point, pointIndex) => {
                const status = getPointStatus(route, point.order_id);
                const isDelivered = status === 'delivered';
                const isCurrent = pointIndex === 0 && !isDelivered && route.points.length > 0;
                
                return (
                  <div 
                    key={point.order_id} 
                    style={{ 
                      padding: '12px',
                      marginBottom: '8px',
                      background: isDelivered 
                        ? '#f6ffed' 
                        : isCurrent 
                        ? '#e6f7ff' 
                        : '#fafafa',
                      border: isCurrent 
                        ? '2px solid #1890ff' 
                        : isDelivered 
                        ? '2px solid #52c41a' 
                        : '1px solid #e8e8e8',
                      borderRadius: '8px',
                      opacity: isDelivered ? 0.8 : 1,
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          background: isDelivered 
                            ? '#52c41a' 
                            : isCurrent 
                            ? '#1890ff' 
                            : '#d9d9d9',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {isDelivered ? '✓' : pointIndex + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: '600',
                            fontSize: '14px',
                            marginBottom: '4px',
                            textDecoration: isDelivered ? 'line-through' : 'none',
                            color: isDelivered ? '#999' : '#333'
                          }}>
                            Заказ #{point.order_id}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            <ClockCircleOutlined style={{ marginRight: '4px', fontSize: '12px' }} />
                            {formatTime(point.arrival_time)}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        {isDelivered ? (
                          <Tag color="green" style={{ fontSize: '12px' }}>
                            <CheckCircleOutlined /> Доставлен
                          </Tag>
                        ) : isCurrent ? (
                          <Tag color="blue" style={{ fontSize: '12px' }}>
                            <ClockCircleOutlined /> Сейчас
                          </Tag>
                        ) : (
                          <Tag color="default" style={{ fontSize: '12px' }}>
                            Ожидает
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default RouteList;