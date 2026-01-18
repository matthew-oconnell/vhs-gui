import { useState, useEffect } from 'react';
import './Notification.css';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string;
  type?: NotificationType;
  duration?: number; // in milliseconds
  onClose?: () => void;
}

const Notification = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}: NotificationProps) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    
    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);
  
  if (!visible) return null;
  
  return (
    <div className={`notification ${type}`}>
      {message}
    </div>
  );
};

export default Notification;