import { Button, Layout, Modal, Typography, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useChatStore } from '../store/chatStore';
import { useState } from 'react';

const { Header } = Layout;
const { Title } = Typography;

export const ChatHeader = () => {
  const { clearMessages, isLoading } = useChatStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const showConfirmModal = () => {
    setIsModalVisible(true);
  };

  const handleClearMessages = async () => {
    try {
      setIsClearing(true);
      await clearMessages();
      message.success('会话已清空');
    } catch (error) {
      message.error('清空会话失败');
      console.error('清空会话失败:', error);
    } finally {
      setIsClearing(false);
      setIsModalVisible(false);
    }
  };

  return (
    <Header className="flex items-center justify-between" style={{ padding: '0 20px' }}>
      <Title level={3} style={{ color: 'white', margin: 0 }}>AgentKai 智能助手</Title>
      
      <Button 
        danger 
        icon={<DeleteOutlined />} 
        onClick={showConfirmModal}
        ghost
        loading={isClearing}
        disabled={isLoading || isClearing}
      >
        清空会话
      </Button>

      <Modal
        title="确认清空会话"
        open={isModalVisible}
        onOk={handleClearMessages}
        confirmLoading={isClearing}
        onCancel={() => setIsModalVisible(false)}
        okText="确认清空"
        cancelText="取消"
      >
        <p>确定要清空当前会话的所有消息吗？此操作不可恢复。</p>
      </Modal>
    </Header>
  );
};