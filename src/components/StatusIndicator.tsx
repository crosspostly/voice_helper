import React from 'react';
import { Status } from '../hooks/useLiveSession';

interface StatusIndicatorProps {
    status: Status;
    t: Record<string, string>;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, t }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'IDLE': return { text: t.status_IDLE, color: 'bg-gray-500' };
      case 'CONNECTING': return { text: t.status_CONNECTING, color: 'bg-yellow-500 animate-pulse' };
      case 'LISTENING': return { text: t.status_LISTENING, color: 'bg-blue-500 animate-pulse' };
      case 'SPEAKING': return { text: t.status_SPEAKING, color: 'bg-green-500' };
      case 'PROCESSING': return { text: t.status_PROCESSING, color: 'bg-teal-500 animate-pulse' };
      case 'RECONNECTING': return { text: t.status_RECONNECTING, color: 'bg-orange-500 animate-pulse' };
      case 'ERROR': return { text: t.status_ERROR, color: 'bg-red-500' };
      default: return { text: 'Idle', color: 'bg-gray-500' };
    }
  };
  const { text, color } = getStatusInfo();
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-sm font-medium text-text">{text}</span>
    </div>
  );
};
