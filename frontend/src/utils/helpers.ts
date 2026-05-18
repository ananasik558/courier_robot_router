export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} км`;
  }
  return `${Math.round(meters)} м`;
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours > 0) {
    return `${hours} ч ${mins} мин`;
  }
  return `${mins} мин`;
};

export const calculateCenter = (coordinates: Array<[number, number]>): [number, number] => {
  if (coordinates.length === 0) return [55.7558, 37.6173]; // Москва по умолчанию
  
  const lat = coordinates.reduce((sum, [lat]) => sum + lat, 0) / coordinates.length;
  const lng = coordinates.reduce((sum, [, lng]) => sum + lng, 0) / coordinates.length;
  
  return [lat, lng];
};

export const generateId = (): number => {
  return Math.floor(Date.now() + Math.random() * 1000);
};