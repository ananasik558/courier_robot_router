import React from 'react';
import { Layout, Typography } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

const Header: React.FC = () => {
  return (
    <AntHeader style={{ 
      background: '#fff', 
      padding: '0 24px',
      borderBottom: '1px solid #e8e8e8',
      display: 'flex',
      alignItems: 'center',
      height: '64px'
    }}>
      <RocketOutlined style={{ fontSize: '28px', color: '#1890ff', marginRight: '12px' }} />
      <Title level={3} style={{ margin: 0 }}>
        Оптимизация маршрутов курьеров
      </Title>
    </AntHeader>
  );
};

export default Header;