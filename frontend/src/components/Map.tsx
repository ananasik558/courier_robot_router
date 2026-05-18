import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Order, OptimizedRoute, Depot, RoutePoint } from '../types';
import { api } from '../services/api';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapProps {
  orders: Order[];
  routes: OptimizedRoute[];
  depot: Depot;
}

interface RouteGeometry {
  courierId: number;
  courierType: string; 
  coordinates: [number, number][];
  color: string;
  dashArray?: string; 
}

const Map: React.FC<MapProps> = ({ orders, routes, depot }) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([55.7558, 37.6173]);
  const [routeGeometries, setRouteGeometries] = useState<RouteGeometry[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];
  
  const getRouteStyle = (courierType: string, index: number) => {
    if (courierType === 'foot') {
      return {
        color: '#ff4d4f', 
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 8' 
      };
    } else {
      return {
        color: colors[index % colors.length],
        weight: 5,
        opacity: 0.8,
        dashArray: ''  
      };
    }
  };

  const getMarkerIcon = (courierType: string, color: string, number: number) => {
    const iconHtml = courierType === 'foot' 
      ? `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚶${number}</div>`
      : `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚴${number}</div>`;
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: iconHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

  const fetchRouteGeometry = async (points: RoutePoint[], profile: string): Promise<[number, number][]> => {
      if (points.length === 0) return [];

      const coordinates = [
        `${depot.longitude},${depot.latitude}`,
        ...points.map(p => `${p.longitude},${p.latitude}`),
        `${depot.longitude},${depot.latitude}`
      ].join(';');

      try {
        // ✅ Лог для отладки
        console.log(`Fetching geometry with profile: ${profile} for ${points.length} points`);
        
        const response = await api.getRouteGeometry(coordinates, profile);
        
        if (response.routes && response.routes[0]?.geometry?.coordinates) {
          return response.routes[0].geometry.coordinates.map((coord: [number, number]) => [
            coord[1], coord[0]
          ]);
        }
      } catch (error) {
        console.error('Error fetching route geometry:', error);
      }
      return [];
  };

  useEffect(() => {
    const loadGeometries = async () => {
      if (routes.length === 0) {
        setRouteGeometries([]);
        return;
      }

      setLoadingRoutes(true);
      
      try {
        const geometries: RouteGeometry[] = [];
        
        for (let i = 0; i < routes.length; i++) {
          const route = routes[i];
          // ✅ Получаем профиль из ответа бэкенда
          const profile = route.courier_type || 'bicycle';
          
          console.log(`Route ${route.courier_id} type: ${profile}`);  // ← Лог для отладки
          
          const coords = await fetchRouteGeometry(route.points, profile);
          
          if (coords.length > 0) {
            geometries.push({
              courierId: route.courier_id,
              courierType: profile,  // ✅ Сохраняем тип
              coordinates: coords,
              color: getRouteStyle(profile, i).color,
              dashArray: getRouteStyle(profile, i).dashArray
            });
          }
        }
        setRouteGeometries(geometries);
      } catch (error) {
        console.error('Error loading route geometries:', error);
      } finally {
        setLoadingRoutes(false);
      }
    };

    loadGeometries();
  }, [routes, depot]);

  useEffect(() => {
    if (orders.length > 0 || routes.length > 0) {
      const allPoints: Array<[number, number]> = [
        [depot.latitude, depot.longitude],
        ...orders.map(o => [o.latitude, o.longitude] as [number, number])
      ];
      
      const center = allPoints.reduce(
        (acc, point) => [acc[0] + point[0] / allPoints.length, acc[1] + point[1] / allPoints.length],
        [0, 0]
      ) as [number, number];
      
      setMapCenter(center);
    }
  }, [orders, routes, depot]);

  return (
    <MapContainer 
      center={mapCenter} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Circle
        center={[depot.latitude, depot.longitude]}
        radius={100}
        pathOptions={{ color: '#722ed1', fillColor: '#722ed1', fillOpacity: 0.5 }}
      >
        <Popup>Ресторан (Депо)</Popup>
      </Circle>

      {orders.map((order) => (
        <Marker 
          key={order.id} 
          position={[order.latitude, order.longitude]}
        >
          <Popup>
            <div>
              <strong>Заказ #{order.id}</strong><br />
              Вес: {order.weight} кг<br />
              Готов: {new Date(order.ready_time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}<br />
              Дедлайн: {new Date(order.deadline).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
            </div>
          </Popup>
        </Marker>
      ))}

      {loadingRoutes && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          Загрузка маршрутов...
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: '14px'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>📍 Типы курьеров:</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '30px', height: '4px', background: '#1890ff', marginRight: '8px' }}></div>
          <span>Велосипед (сплошная)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '30px', height: '4px', background: '#ff4d4f', borderTop: '4px dashed #ff4d4f', marginRight: '8px' }}></div>
          <span>Пешком (пунктир)</span>
        </div>
      </div>

      {routeGeometries.map((geometry, index) => (
        <Polyline
          key={geometry.courierId}
          positions={geometry.coordinates}
          pathOptions={{ 
            color: geometry.color,
            weight: geometry.courierType === 'foot' ? 4 : 5,
            opacity: 0.8,
            dashArray: geometry.dashArray
          }}
        />
      ))}

      {routes.map((route, routeIndex) => 
        route.points.map((point, pointIndex) => {
          const courierType = route.courier_type || 'bicycle';
          const style = getRouteStyle(courierType, routeIndex);
          
          return (
            <Marker
              key={`${route.courier_id}-${point.order_id}`}
              position={[point.latitude, point.longitude]}
              icon={getMarkerIcon(courierType, style.color, pointIndex + 1)}
            >
              <Popup>
                <div>
                  <strong>{courierType === 'foot' ? '🚶' : '🚴'} Курьер #{route.courier_id}</strong><br />
                  Тип: {courierType === 'foot' ? 'Пешком' : 'Велосипед'}<br />
                  Точка #{pointIndex + 1}<br />
                  Заказ #{point.order_id}<br />
                  Прибытие: {new Date(point.arrival_time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                </div>
              </Popup>
            </Marker>
          );
        })
      )}
    </MapContainer>
  );
};

export default Map;