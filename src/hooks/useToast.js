import { useState, useCallback } from 'react';

// Toast通知管理フック
export function useToast() {
  const [toasts, setToasts] = useState([]);

  // Toast追加
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // 自動削除
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  // Toast削除
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // 全Toast削除
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts
  };
}