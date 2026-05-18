import React from 'react';
import { Form, Input, InputNumber, Typography } from 'antd';
import { Depot } from '../types';
import AddressSearch from './AddressSearch'; 

const { Text } = Typography;

interface DepotFormProps {
  depot: Depot;
  setDepot: (depot: Depot) => void;
}

const DepotForm: React.FC<DepotFormProps> = ({ depot, setDepot }) => {
  
  const handleAddressSelect = (lat: number, lon: number, fullAddress: string) => {
    setDepot({
      latitude: lat,
      longitude: lon,
      address: fullAddress
    });
  };

  return (
    <div className="form-section">
      <div className="section-title">Ресторан (Депо)</div>
      
      <Form layout="vertical">
        <Form.Item label="Поиск адреса">
          <AddressSearch 
            onAddressSelect={handleAddressSelect}
            placeholder="Например: ул. Арбат, 1"
            defaultValue={depot.address}
          />
        </Form.Item>

        <Form.Item label="Адрес">
          <Input 
            value={depot.address}
            onChange={(e) => setDepot({...depot, address: e.target.value})}
            placeholder="ул. Примерная, д. 1"
          />
        </Form.Item>

        <Form.Item label="Широта">
          <InputNumber 
            style={{ width: '100%' }}
            value={depot.latitude}
            onChange={(value) => setDepot({...depot, latitude: value || 55.7558})}
            min={-90}
            max={90}
            step={0.0001}
            disabled
          />
        </Form.Item>

        <Form.Item label="Долгота">
          <InputNumber 
            style={{ width: '100%' }}
            value={depot.longitude}
            onChange={(value) => setDepot({...depot, longitude: value || 37.6173})}
            min={-180}
            max={180}
            step={0.0001}
            disabled
          />
        </Form.Item>

        <Text type="secondary" style={{ fontSize: '12px' }}>
          Введите адрес и нажмите "Найти" для автоматического определения координат
        </Text>
      </Form>
    </div>
  );
};

export default DepotForm;