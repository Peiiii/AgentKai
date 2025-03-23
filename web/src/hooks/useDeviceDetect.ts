import { useState, useEffect } from 'react';

/**
 * 设备检测hook，用于检测当前设备是移动设备还是桌面设备
 * @returns { isMobile: boolean } 是否为移动设备
 */
export function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // 初始检测
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 首次运行
    checkDevice();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkDevice);
    
    // 清理函数
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return { isMobile };
}
