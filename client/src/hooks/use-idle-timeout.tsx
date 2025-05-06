import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { useLocation } from 'wouter';

// 定義閒置超時時間（毫秒）
const IDLE_TIMEOUT = 12 * 60 * 60 * 1000; // 12小時
// 警告顯示時間（毫秒）
const WARNING_TIME = 5 * 60 * 1000; // 5分鐘

/**
 * 使用hook來處理使用者閒置超時和自動登出
 */
export function useIdleTimeout() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState<boolean>(false);
  
  // 重設閒置計時器
  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  // 處理用戶活動
  const handleUserActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // 執行登出
  const performLogout = useCallback(() => {
    // 僅當用戶已登入時執行登出
    if (user) {
      toast({
        title: "自動登出",
        description: "您已超過12小時未操作，系統已自動登出。",
      });
      
      // 執行登出操作
      logoutMutation.mutate(undefined, {
        onSuccess: () => {
          // 導向登入頁面
          setLocation('/auth');
        }
      });
    }
  }, [user, logoutMutation, toast, setLocation]);

  // 檢查閒置狀態
  useEffect(() => {
    if (!user) return; // 如果使用者未登入，則不啟動計時器
    
    // 如果在登入頁面，不需要檢查閒置狀態
    if (window.location.pathname === '/auth') return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivity;

      // 如果閒置時間接近超時，顯示警告
      if (idleTime >= IDLE_TIMEOUT - WARNING_TIME && !showWarning) {
        setShowWarning(true);
        toast({
          title: "即將自動登出",
          description: "您已閒置一段時間，系統將在5分鐘後自動登出。",
          duration: 10000, // 10秒
        });
      }

      // 如果超過閒置時間，則執行登出
      if (idleTime >= IDLE_TIMEOUT) {
        performLogout();
        clearInterval(intervalId);
      }
    }, 60000); // 每分鐘檢查一次

    return () => clearInterval(intervalId);
  }, [lastActivity, performLogout, showWarning, toast, user]);

  // 設置事件監聽器以檢測用戶活動
  useEffect(() => {
    if (!user) return; // 如果使用者未登入，則不添加事件監聽

    // 監聽用戶活動事件
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart',
      'click', 'keydown', 'wheel'
    ];

    // 為每個事件添加監聽器
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      // 清理事件監聽器
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [handleUserActivity, user]);

  return { resetTimer };
}

/**
 * 閒置超時組件，用於處理自動登出
 */
export function IdleTimeoutHandler() {
  useIdleTimeout(); // 使用閒置超時hook
  return null; // 這個組件不渲染任何內容
}
