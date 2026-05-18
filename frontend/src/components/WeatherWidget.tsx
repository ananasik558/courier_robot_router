// frontend/src/components/WeatherWidget.tsx

import React, { useEffect, useState } from 'react';
import { Card, Tag } from 'antd';
import { 
  CloudOutlined, 
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

interface WeatherData {
  temperature: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  wind_speed: number;
  speed_modifier_bicycle: number;
  speed_modifier_foot: number;
}

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ latitude, longitude }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/weather?lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error('Weather fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [latitude, longitude]);

  if (loading) {
    return <Card size="small" loading={true} />;
  }

  if (!weather) {
    return null;
  }

  const getWeatherIcon = () => {
    if (weather.snowfall > 0) {
      return <WarningOutlined style={{ color: '#1890ff', fontSize: '18px' }} />;
    }
    if (weather.rain > 0 || weather.precipitation > 0) {
      return <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '18px' }} />;
    }
    return <CloudOutlined style={{ color: '#52c41a', fontSize: '18px' }} />;
  };

  const getImpactTag = (modifier: number) => {
    if (modifier >= 0.9) {
      return <Tag color="green">Нормально</Tag>;
    } else if (modifier >= 0.7) {
      return <Tag color="orange">Замедление</Tag>;
    } else {
      return <Tag color="red">Сильное замедление</Tag>;
    }
  };

  return (
    <Card 
      size="small" 
      title="🌦️ Погодные условия"
      style={{ marginBottom: '16px' }}
      extra={getWeatherIcon()}
    >
      <div style={{ marginBottom: '12px' }}>
        ☀️ Температура: <strong>{weather.temperature}°C</strong>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        💨 Ветер: <strong>{weather.wind_speed} м/с</strong>
      </div>
      
      {(weather.rain > 0 || weather.snowfall > 0 || weather.precipitation > 0) && (
        <div style={{ marginBottom: '12px' }}>
          ⚠️ Осадки: 
          {weather.rain > 0 && <span> дождь {weather.rain} мм</span>}
          {weather.snowfall > 0 && <span> снег {weather.snowfall} мм</span>}
          {weather.precipitation > 0 && weather.rain === 0 && weather.snowfall === 0 && 
            <span> {weather.precipitation} мм</span>}
        </div>
      )}
      
      <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: '8px' }}>
        <div style={{ marginBottom: '4px' }}>
          🚴 Велосипед: {getImpactTag(weather.speed_modifier_bicycle)}
          <span style={{ fontSize: '12px', color: '#999' }}>
            {' '}({(weather.speed_modifier_bicycle * 100).toFixed(0)}% скорости)
          </span>
        </div>
        <div>
          🚶 Пешком: {getImpactTag(weather.speed_modifier_foot)}
          <span style={{ fontSize: '12px', color: '#999' }}>
            {' '}({(weather.speed_modifier_foot * 100).toFixed(0)}% скорости)
          </span>
        </div>
      </div>
    </Card>
  );
};

export default WeatherWidget;