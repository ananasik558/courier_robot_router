// frontend/src/components/ObstaclesWidget.tsx

import React, { useEffect, useState } from 'react';
import { Card, Tag, Button, Modal, Form, Input, InputNumber, message } from 'antd';
import { ExclamationCircleOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons';

interface Obstacle {
  id: number;
  lat: number;
  lon: number;
  radius_m: number;
  description: string;
  type: string;
  end_date?: string;
}

interface ObstaclesWidgetProps {
  latitude: number;
  longitude: number;
  onObstacleAdded?: () => void;
}

const ObstaclesWidget: React.FC<ObstaclesWidgetProps> = ({ 
  latitude, longitude, onObstacleAdded 
}) => {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchObstacles();
  }, [latitude, longitude]);

  const fetchObstacles = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/obstacles?lat=${latitude}&lon=${longitude}&radius_km=5`
      );
      const data = await response.json();
      setObstacles(data.obstacles || []);
    } catch (error) {
      console.error('Obstacles fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddObstacle = async () => {
    try {
      const values = await form.validateFields();
      const response = await fetch('/api/obstacles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: latitude,
          longitude: longitude,
          radius_m: values.radius_m || 100,
          description: values.description,
          days_duration: values.days_duration || 7
        })
      });
      
      const data = await response.json();
      if (data.success) {
        message.success('Препятствие добавлено');
        setModalVisible(false);
        form.resetFields();
        fetchObstacles();
        onObstacleAdded?.();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.error('Add obstacle error:', error);
    }
  };

  return (
    <>
      <Card 
        size="small" 
        title="🏗️ Препятствия"
        style={{ marginBottom: '16px' }}
        extra={
          <Button 
            type="primary" 
            size="small" 
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Добавить
          </Button>
        }
      >
        {loading ? (
          <div>Загрузка...</div>
        ) : obstacles.length === 0 ? (
          <div style={{ color: '#999', fontSize: '13px' }}>
            Нет активных препятствий в радиусе 5 км
          </div>
        ) : (
          <div>
            {obstacles.map((obstacle) => (
              <div 
                key={obstacle.id} 
                style={{ 
                  padding: '8px', 
                  marginBottom: '8px', 
                  background: '#fff7e6', 
                  borderRadius: '4px',
                  border: '1px solid #ffd591'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <ToolOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                  <strong>{obstacle.type === 'construction' ? 'Ремонт' : 'Мероприятие'}</strong>
                  <Tag color="orange" style={{ marginLeft: '8px' }}>
                    {obstacle.radius_m}м
                  </Tag>
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {obstacle.description}
                </div>
                {obstacle.end_date && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    До: {new Date(obstacle.end_date).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        title="Добавить препятствие"
        open={modalVisible}
        onOk={handleAddObstacle}
        onCancel={() => setModalVisible(false)}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание' }]}
          >
            <Input placeholder="Например: Ремонт дороги" />
          </Form.Item>
          
          <Form.Item
            name="radius_m"
            label="Радиус зоны (м)"
            initialValue={100}
          >
            <InputNumber min={10} max={1000} step={10} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="days_duration"
            label="Длительность (дней)"
            initialValue={7}
          >
            <InputNumber min={1} max={365} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ObstaclesWidget;