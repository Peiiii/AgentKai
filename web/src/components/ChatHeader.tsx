import { Layout, Typography } from 'antd';

const { Header } = Layout;
const { Title } = Typography;

export const ChatHeader = () => {
  return (
    <Header className="flex items-center" style={{ padding: '0 20px' }}>
      <Title level={3} style={{ color: 'white', margin: 0 }}>AgentKai 智能助手</Title>
    </Header>
  );
};