import React, { useState } from 'react';
import { Input, Button, message, Spin } from 'antd';
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';

interface AddressSearchProps {
  onAddressSelect: (latitude: number, longitude: number, address: string) => void;
  placeholder?: string;
  defaultValue?: string;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ 
  onAddressSelect, 
  placeholder = "Введите адрес...",
  defaultValue = ""
}) => {
  const [address, setAddress] = useState(defaultValue);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!address.trim()) {
      message.warning('Введите адрес');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          city: 'Москва'
        })
      });

      const data = await response.json();

      if (data.success && data.latitude && data.longitude) {
        onAddressSelect(data.latitude, data.longitude, data.address || address);
        message.success('Адрес найден!');
      } else {
        message.error('Адрес не найден. Попробуйте уточнить.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      message.error('Ошибка поиска адреса');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Input
        placeholder={placeholder}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onKeyPress={handleKeyPress}
        prefix={<EnvironmentOutlined />}
        allowClear
      />
      <Button 
        type="primary" 
        icon={loading ? <Spin size="small" /> : <SearchOutlined />}
        onClick={handleSearch}
        loading={loading}
      >
        Найти
      </Button>
    </div>
  );
};

export default AddressSearch;