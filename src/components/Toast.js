import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 150); // Allow fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          icon: CheckCircle
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          icon: AlertCircle
        };
      default:
        return {
          backgroundColor: '#6B7280',
          icon: AlertCircle
        };
    }
  };

  const { backgroundColor, icon: Icon } = getToastStyle();

  return (
    <div 
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white transition-all duration-150 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      style={{ backgroundColor, fontFamily: 'Inter' }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 150);
        }}
        className="ml-2 p-1 hover:bg-black/10 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}

// Global toast function - can be used anywhere
let globalShowToast = null;

export const setGlobalToastFunction = (showToastFn) => {
  globalShowToast = showToastFn;
};

export const showGlobalToast = (message, type = 'success') => {
  if (globalShowToast) {
    globalShowToast(message, type);
  } else {
    console.log(`${type.toUpperCase()}: ${message}`);
  }
};