import React from 'react';
import { Typography } from 'antd';
import { OptimizationResponse } from '../types';
import { formatDistance, formatDuration } from '../utils/helpers';

const { Text } = Typography;

interface StatsProps {
  result: OptimizationResponse | null;
  loading: boolean;
}

const Stats: React.FC<StatsProps> = ({ result, loading }) => {
  if (!result && !loading) {
    return (
      <div className="stats-card" style={{ background: '#f0f0f0', color: '#666' }}>
        <h3>Статистика</h3>
        <div className="value">—</div>
        <Text>Добавьте заказы и нажмите "Оптимизировать"</Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="stats-card">
        <h3>Вычисление...</h3>
        <div className="value">⏳</div>
      </div>
    );
  }

  return (
    <div className="stats-card">
      <h3>Результаты оптимизации</h3>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>Всего времени</div>
        <div className="value">{formatDuration(result!.total_time_min)}</div>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>Всего расстояния</div>
        <div className="value">{formatDistance(result!.total_distance_m)}</div>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>Маршрутов</div>
        <div className="value">{result!.routes.length}</div>
      </div>
      <div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>Время вычисления</div>
        <div className="value">{(result!.computation_time_ms / 1000).toFixed(2)} сек</div>
      </div>
    </div>
  );
};

export default Stats;