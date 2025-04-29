import { Memory, MemoryType } from '@agentkai/core';
import { PlusOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty, Form, Input, List, Modal, Radio, Select, Spin, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useMemoryStore } from '../store/memoryStore';
import { MemoryCard } from './MemoryCard';
const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface MemoryListProps {
  initialMemories?: Memory[];
}

/**
 * 记忆列表组件
 * 展示和管理AI的记忆
 */
export const MemoryList: React.FC<MemoryListProps> = ({ initialMemories }) => {
  const { 
    memories: storeMemories, 
    categories, 
    tags,
    selectedCategory,
    selectedTag,
    minImportance,
    isLoading,
    loadMemories,
    addMemory,
    deleteMemory,
    setImportance,
    filterByCategory,
    filterByTag,
    filterByImportance,
    clearFilters
  } = useMemoryStore();
  
  // 使用初始记忆或存储中的记忆
  const memories = initialMemories || storeMemories;
  
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  // 初始加载记忆
  useEffect(() => {
    if (!initialMemories) {
      loadMemories();
    }
  }, [loadMemories, initialMemories]);
  
  // 处理记忆删除
  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
  };
  
  // 处理重要性更改
  const handleImportanceChange = async (id: string, importance: number) => {
    await setImportance(id, importance);
  };
  
  // 打开添加记忆模态框
  const showAddModal = () => {
    setIsAddModalVisible(true);
  };
  
  // 处理添加记忆
  const handleAddMemory = async () => {
    try {
      const values = await form.validateFields();
    
      const newMemory: Memory = {
        id: `memory_${Date.now()}`,
        content: values.content,
        createdAt: Date.now(),
        type: MemoryType.OBSERVATION,
        metadata: {
          source: 'user',
        },
      };
      
      await addMemory(newMemory);
      form.resetFields();
      setIsAddModalVisible(false);
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  };
  
  // 渲染过滤器
  const renderFilters = () => {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          placeholder="选择类别"
          style={{ width: 120 }}
          allowClear
          value={selectedCategory}
          onChange={(value) => filterByCategory(value)}
        >
          {categories.map(category => (
            <Option key={category} value={category}>{category}</Option>
          ))}
        </Select>
        
        <Select
          placeholder="选择标签"
          style={{ width: 120 }}
          allowClear
          value={selectedTag}
          onChange={(value) => filterByTag(value)}
        >
          {tags.map(tag => (
            <Option key={tag} value={tag}>{tag}</Option>
          ))}
        </Select>
        
        <Radio.Group
          value={minImportance}
          onChange={(e) => filterByImportance(e.target.value)}
          className="ml-2"
        >
          <Radio.Button value={0}>全部</Radio.Button>
          <Radio.Button value={1}><StarOutlined /> 1+</Radio.Button>
          <Radio.Button value={3}><StarOutlined /> 3+</Radio.Button>
        </Radio.Group>
        
        <Button 
          onClick={clearFilters} 
          size="small" 
          className="ml-2"
        >
          清除过滤
        </Button>
      </div>
    );
  };
  
  // 渲染添加记忆模态框
  const renderAddModal = () => {
    return (
      <Modal
        title="添加新记忆"
        open={isAddModalVisible}
        onOk={handleAddMemory}
        onCancel={() => setIsAddModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="content"
            label="记忆内容"
            rules={[{ required: true, message: '请输入记忆内容' }]}
          >
            <TextArea rows={4} placeholder="记忆内容..." />
          </Form.Item>
          
          <Form.Item name="category" label="类别">
            <Select
              placeholder="选择或输入类别"
              allowClear
              showSearch
            >
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="tags" label="标签">
            <Input placeholder="输入标签，用逗号分隔" />
          </Form.Item>
          
          <Form.Item name="importance" label="重要性">
            <Select placeholder="设置重要性">
              <Option value={0}>普通</Option>
              <Option value={1}>低重要性</Option>
              <Option value={2}>中等重要性</Option>
              <Option value={3}>高重要性</Option>
              <Option value={4}>非常重要</Option>
              <Option value={5}>最高重要性</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    );
  };
  
  return (
    <div className="memory-list">
      <div className="flex justify-between items-center mb-4">
        <Title level={4}>
          记忆管理
          {selectedCategory && <Tag color="green" className="ml-2">{selectedCategory}</Tag>}
          {selectedTag && <Tag color="blue" className="ml-2">{selectedTag}</Tag>}
          {minImportance > 0 && (
            <Tag color="gold" className="ml-2">
              <StarOutlined /> {minImportance}+
            </Tag>
          )}
        </Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={showAddModal}
        >
          添加记忆
        </Button>
      </div>
      
      {renderFilters()}
      
      {isLoading ? (
        <div className="flex justify-center my-8">
          <Spin tip="加载中..." />
        </div>
      ) : memories.length === 0 ? (
        <Empty 
          description="没有找到记忆" 
          className="my-8"
        />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
          dataSource={memories}
          renderItem={memory => (
            <List.Item>
              <MemoryCard 
                memory={memory} 
                onDelete={handleDeleteMemory}
                onImportanceChange={handleImportanceChange}
              />
            </List.Item>
          )}
        />
      )}
      
      {renderAddModal()}
    </div>
  );
}; 