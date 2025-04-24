import React from 'react';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, isLoading }) => {
  const handlePressEnter = () => {
    if (!isLoading) {
      onSend();
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="flex">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPressEnter={handlePressEnter}
          placeholder="输入消息..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={onSend}
          loading={isLoading}
          className="ml-2"
        >
          发送
        </Button>
      </div>
    </div>
  );
};