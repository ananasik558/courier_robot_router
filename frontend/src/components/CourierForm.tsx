import React from 'react';
import { Form, InputNumber, Select, Button, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Courier } from '../types';

const { Text } = Typography;

interface CourierFormProps {
  couriers: Courier[];
  setCouriers: (couriers: Courier[]) => void;
}

const CourierForm: React.FC<CourierFormProps> = ({ couriers, setCouriers }) => {
  const [form] = Form.useForm();

  const handleAddCourier = () => {
    form.validateFields().then((values) => {
      const newCourier: Courier = {
        id: couriers.length + 1,
        type: values.type,
        capacity: values.capacity,
        speed_kmh: values.speed_kmh
      };
      
      setCouriers([...couriers, newCourier]);
      form.resetFields();
    });
  };

  const handleRemoveCourier = (id: number) => {
    setCouriers(couriers.filter(c => c.id !== id));
  };

  const handleAddSampleCouriers = () => {
    const sampleCouriers: Courier[] = [
      { id: 1, type: 'bicycle', capacity: 10, speed_kmh: 15 },
      { id: 2, type: 'foot', capacity: 5, speed_kmh: 5 },
    ];
    setCouriers(sampleCouriers);
  };

  return (
    <div className="form-section">
      <div className="section-title">Курьеры</div>
      
      <Form form={form} layout="vertical">
        <Form.Item
          name="type"
          label="Тип передвижения"
          rules={[{ required: true }]}
          initialValue="bicycle"
        >
          <Select>
            <Select.Option value="bicycle">Велосипед</Select.Option>
            <Select.Option value="foot">Пешком</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="capacity"
          label="Грузоподъёмность (кг)"
          rules={[{ required: true }]}
          initialValue={10}
        >
          <InputNumber style={{ width: '100%' }} min={1} max={50} />
        </Form.Item>

        <Form.Item
          name="speed_kmh"
          label="Средняя скорость (км/ч)"
          rules={[{ required: true }]}
          initialValue={15}
        >
          <InputNumber style={{ width: '100%' }} min={3} max={30} />
        </Form.Item>

        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddCourier}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          Добавить курьера
        </Button>
        
        <Button 
          onClick={handleAddSampleCouriers}
          style={{ width: '100%' }}
        >
          + 2 тестовых курьера
        </Button>
      </Form>

      <div style={{ marginTop: '16px' }}>
        <Text strong>Курьеров: {couriers.length}</Text>
        
        {couriers.map((courier) => (
          <div key={courier.id} className="courier-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>
                  {courier.type === 'bicycle' ? '🚴' : '🚶'} Курьер #{courier.id}
                </Text><br />
                <Text>
                  {courier.capacity} кг / {courier.speed_kmh} км/ч
                </Text>
              </div>
              <Button 
                type="text" 
                danger
                onClick={() => handleRemoveCourier(courier.id)}
              >
                Удалить
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourierForm;