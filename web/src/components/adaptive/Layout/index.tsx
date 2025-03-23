import { ReactNode } from 'react';
import { useDeviceDetect } from '../../../hooks/useDeviceDetect';
import DesktopLayout from './Desktop';
import MobileLayout from './Mobile';

interface LayoutProps {
  children: ReactNode;
}

/**
 * 自适应布局组件
 * 根据设备类型选择适当的布局实现
 */
export default function Layout({ children }: LayoutProps) {
  const { isMobile } = useDeviceDetect();
  
  // 根据设备类型渲染对应的布局
  return isMobile 
    ? <MobileLayout>{children}</MobileLayout> 
    : <DesktopLayout>{children}</DesktopLayout>;
} 