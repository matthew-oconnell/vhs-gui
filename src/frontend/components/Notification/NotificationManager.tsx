import { useState, useCallback } from 'react';
import Notification, { NotificationType } from './Notification';

interface NotificationItem {
  id: number;
  message: string;
  type: NotificationType;
  duration?: number;
}

const NotificationManager = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const handleClose = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => handleClose(notification.id)}
        />
      ))}
    </div>
  );
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const addNotification = useCallback((message: string, type: NotificationType = 'info', duration: number = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    
    // Auto-remove after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, duration);
    
    return id;
  }, []);
  
  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  return {
    notifications,
    addNotification,
    removeNotification,
    notifySuccess: (message: string, duration?: number) => addNotification(message, 'success', duration),
    notifyError: (message: string, duration?: number) => addNotification(message, 'error', duration),
    notifyInfo: (message: string, duration?: number) => addNotification(message, 'info', duration)
  };
};

export default NotificationManager;