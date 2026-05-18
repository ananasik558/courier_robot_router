// frontend/src/components/OrderForm.tsx

import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Button, Space, Typography, DatePicker, Tag, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { Order } from '../types';
import { generateId } from '../utils/helpers';
import dayjs, { Dayjs } from 'dayjs';
import AddressSearch from './AddressSearch';

const { Text } = Typography;

interface DeliveryStatus {
  courierId: number;
  points: Array<{
    orderId: number;
    status: 'pending' | 'delivered';
  }>;
  timestamp: string;
}

interface OrderFormProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ orders, setOrders }) => {
  const [form] = Form.useForm();
  const [deliveryStatuses, setDeliveryStatuses] = useState<Map<number, 'pending' | 'delivered'>>(new Map());

  // Загружаем статусы доставок при монтировании и при изменении orders
  useEffect(() => {
    const loadStatuses = () => {
      const savedStatus = localStorage.getItem('deliveryStatus');
      if (savedStatus) {
        try {
          const statusData: DeliveryStatus = JSON.parse(savedStatus);
          const statusMap = new Map<number, 'pending' | 'delivered'>();
          statusData.points.forEach(p => {
            statusMap.set(p.orderId, p.status);
          });
          setDeliveryStatuses(statusMap);
        } catch (error) {
          console.error('Error loading delivery statuses:', error);
        }
      }
    };

    loadStatuses();

    // Слушаем изменения в localStorage
    const handleStorageChange = () => {
      loadStatuses();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [orders]);

  const handleAddOrder = () => {
    form.validateFields().then((values) => {
      const newOrder: Order = {
        id: generateId(),
        latitude: values.latitude,
        longitude: values.longitude,
        ready_time: values.ready_time.toISOString(),
        deadline: values.deadline.toISOString(),
        weight: values.weight,
        address: values.address
      };
      
      setOrders([...orders, newOrder]);
      form.resetFields();
    });
  };

  const handleRemoveOrder = (id: number) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  const handleAddSampleOrders = () => {
    const now = dayjs();
    const sampleOrders: Order[] = [
      {
        id: generateId(),
        latitude: 55.7558,
        longitude: 37.6173,
        ready_time: now.toISOString(),
        deadline: now.add(30, 'minute').toISOString(),
        weight: 1.5,
        address: 'Красная площадь, 1, Москва'
      },
      {
        id: generateId(),
        latitude: 55.7512,
        longitude: 37.6184,
        ready_time: now.toISOString(),
        deadline: now.add(30, 'minute').toISOString(),
        weight: 2.0,
        address: 'ул. Большая Дмитровка, 5, Москва'
      },
      {
        id: generateId(),
        latitude: 55.7489,
        longitude: 37.6231,
        ready_time: now.toISOString(),
        deadline: now.add(30, 'minute').toISOString(),
        weight: 1.0,
        address: 'Театральный проезд, 2, Москва'
      }
    ];
    
    setOrders([...orders, ...sampleOrders]);
  };

  const handleClearDelivered = () => {
    const deliveredIds = new Set<number>();
    deliveryStatuses.forEach((status, orderId) => {
      if (status === 'delivered') {
        deliveredIds.add(orderId);
      }
    });

    if (deliveredIds.size === 0) {
      message.info('Нет доставленных заказов для очистки');
      return;
    }

    setOrders(orders.filter(o => !deliveredIds.has(o.id)));
    message.success(`Удалено ${deliveredIds.size} доставленных заказов`);
  };

  const handleClearAll = () => {
    setOrders([]);
    message.info('Все заказы очищены');
  };

  const handleAddressSelect = (lat: number, lon: number, fullAddress: string) => {
    form.setFieldsValue({
      latitude: lat,
      longitude: lon,
      address: fullAddress
    });
  };

  // Считаем статистику
  const deliveredCount = orders.filter(o => deliveryStatuses.get(o.id) === 'delivered').length;
  const pendingCount = orders.filter(o => {
    const status = deliveryStatuses.get(o.id);
    return status === 'pending' || status === undefined;
  }).length;

  return (
    <div className="form-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="section-title" style={{ margin: 0 }}>📦 Заказы</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Tag color="green" style={{ fontSize: '12px' }}>
            <CheckCircleOutlined /> {deliveredCount} доставлено
          </Tag>
          <Tag color="blue" style={{ fontSize: '12px' }}>
            {pendingCount} ожидает
          </Tag>
        </div>
      </div>
      
      <Form form={form} layout="vertical">
        <Form.Item label="Поиск адреса">
          <AddressSearch 
            onAddressSelect={handleAddressSelect}
            placeholder="Например: Красная площадь, 1"
          />
        </Form.Item>

        <Form.Item
          name="latitude"
          label="Широта"
          rules={[{ required: true, message: 'Введите широту' }]}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={-90} 
            max={90} 
            step={0.0001}
            placeholder="55.7558"
            disabled
          />
        </Form.Item>

        <Form.Item
          name="longitude"
          label="Долгота"
          rules={[{ required: true, message: 'Введите долготу' }]}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={-180} 
            max={180} 
            step={0.0001}
            placeholder="37.6173"
            disabled
          />
        </Form.Item>

        <Form.Item
          name="address"
          label="Адрес"
        >
          <Input placeholder="Адрес доставки" />
        </Form.Item>

        <Form.Item
          name="weight"
          label="Вес заказа (кг)"
          rules={[{ required: true }]}
          initialValue={1.0}
        >
          <InputNumber style={{ width: '100%' }} min={0.1} max={20} step={0.1} />
        </Form.Item>

        <Form.Item
          name="ready_time"
          label="Время готовности"
          rules={[{ required: true }]}
          initialValue={dayjs()}
        >
          <DatePicker 
            showTime 
            style={{ width: '100%' }} 
            format="HH:mm"
          />
        </Form.Item>

        <Form.Item
          name="deadline"
          label="Дедлайн доставки"
          rules={[{ required: true }]}
          initialValue={dayjs().add(30, 'minute')}
        >
          <DatePicker 
            showTime 
            style={{ width: '100%' }} 
            format="HH:mm"
          />
        </Form.Item>

        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddOrder}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          Добавить заказ
        </Button>
        
        <Button 
          onClick={handleAddSampleOrders}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          + 3 тестовых заказа
        </Button>

        {orders.length > 0 && (
          <Button 
            onClick={handleClearDelivered}
            style={{ width: '100%', marginBottom: '8px' }}
            icon={<DeleteOutlined />}
            disabled={deliveredCount === 0}
          >
            Очистить доставленные ({deliveredCount})
          </Button>
        )}

        {orders.length > 0 && (
          <Button 
            onClick={handleClearAll}
            danger
            style={{ width: '100%' }}
            icon={<DeleteOutlined />}
          >
            Очистить все заказы
          </Button>
        )}
      </Form>

      <div style={{ marginTop: '16px' }}>
        <Text strong>Добавлено заказов: {orders.length}</Text>
        
        {orders.length === 0 ? (
          <Empty 
            description="Нет заказов" 
            style={{ margin: '24px 0', padding: '20px' }}
          />
        ) : (
          orders.map((order, index) => {
            const status = deliveryStatuses.get(order.id) || 'pending';
            const isDelivered = status === 'delivered';
            
            return (
              <div 
                key={order.id} 
                className="order-item"
                style={{
                  opacity: isDelivered ? 0.6 : 1,
                  border: isDelivered ? '2px solid #52c41a' : '1px solid #e8e8e8',
                  background: isDelivered ? '#f6ffed' : '#fff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Text strong style={{ fontSize: '15px' }}>
                        {isDelivered && <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '4px' }} />}
                        Заказ #{index + 1}
                      </Text>
                      <Tag color={isDelivered ? 'green' : 'orange'}>
                        {isDelivered ? '✓ Доставлен' : '⏳ Ожидает'}
                      </Tag>
                    </div>
                    
                    {order.address && (
                      <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>
                        📍 {order.address}
                      </Text>
                    )}
                    
                    <Text style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                      {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}
                    </Text>
                    
                    <Text style={{ display: 'block', fontSize: '13px' }}>
                      ⚖️ Вес: {order.weight} кг
                    </Text>
                    
                    <Text style={{ display: 'block', fontSize: '13px' }}>
                      🕐 {dayjs(order.ready_time).format('HH:mm')} - {dayjs(order.deadline).format('HH:mm')}
                    </Text>
                  </div>
                  
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveOrder(order.id)}
                    style={{ marginLeft: '8px' }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderForm;