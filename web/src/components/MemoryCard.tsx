import { DeleteOutlined, EyeOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { Button, Card, Modal, Tag, Tooltip, Typography } from 'antd';
import React, { useState } from 'react';
import { Memory } from '../types/chat';

const { Paragraph, Text } = Typography;

interface MemoryCardProps {
  memory: Memory;
  onDelete?: (id: string) => void;
  onImportanceChange?: (id: string, importance: number) => void;
}

/**
 * 记忆卡片组件
 * 展示单条记忆内容，支持查看详情、设置重要性和删除操作
 */
export const MemoryCard: React.FC<MemoryCardProps> = ({ 
  memory, 
  onDelete, 
  onImportanceChange 
}) => {
  const [detailVisible, setDetailVisible] = useState(false);
  
  // 记忆创建时间格式化
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 处理记忆重要性变更
  const handleImportanceChange = () => {
    if (onImportanceChange) {
      // 在1-5之间循环
      const newImportance = ((memory.importance || 0) % 5) + 1;
      onImportanceChange(memory.id, newImportance);
    }
  };
  
  // 处理删除记忆
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '你确定要删除这条记忆吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if (onDelete) {
          onDelete(memory.id);
        }
      }
    });
  };
  
  // 生成重要性星标
  const renderImportance = () => {
    const importance = memory.importance || 0;
    return (
      <div onClick={handleImportanceChange} style={{ cursor: 'pointer' }}>
        {importance > 0 ? (
          <Tooltip title={`重要性: ${importance}`}>
            <StarFilled style={{ color: '#faad14', fontSize: '16px' }} />
            {importance > 1 && <Text style={{ fontSize: '12px', marginLeft: '2px' }}>{importance}</Text>}
          </Tooltip>
        ) : (
          <Tooltip title="标记为重要">
            <StarOutlined style={{ color: '#d9d9d9', fontSize: '16px' }} />
          </Tooltip>
        )}
      </div>
    );
  };
  
  // 渲染标签
  const renderTags = () => {
    if (!memory.tags || memory.tags.length === 0) return null;
    
    return (
      <div className="mt-2">
        {memory.tags.map(tag => (
          <Tag key={tag} color="blue" className="mr-1 mb-1">{tag}</Tag>
        ))}
      </div>
    );
  };
  
  return (
    <>
      <Card 
        size="small" 
        className="mb-2 hover:shadow-md transition-shadow"
        actions={[
          <Tooltip title="查看详情" key="view">
            <EyeOutlined onClick={() => setDetailVisible(true)} />
          </Tooltip>,
          renderImportance(),
          <Tooltip title="删除" key="delete">
            <DeleteOutlined onClick={handleDelete} />
          </Tooltip>
        ]}
      >
        <div>
          {memory.category && (
            <Tag color="green" className="mb-2">{memory.category}</Tag>
          )}
          <Paragraph ellipsis={{ rows: 2 }}>
            {memory.content}
          </Paragraph>
          <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
            <Text type="secondary">{formatDate(memory.timestamp)}</Text>
          </div>
          {renderTags()}
        </div>
      </Card>
      
      {/* 详情模态框 */}
      <Modal
        title="记忆详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div className="mb-4">
          {memory.category && (
            <Tag color="green" className="mb-2">{memory.category}</Tag>
          )}
          {renderTags()}
        </div>
        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {memory.content}
        </Paragraph>
        <div className="mt-4 text-gray-500">
          <Text type="secondary">创建时间: {formatDate(memory.timestamp)}</Text>
        </div>
      </Modal>
    </>
  );
}; 