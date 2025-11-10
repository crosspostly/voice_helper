import React from 'react';
import { ProgressCard } from '../ProgressCard';

interface ProgressCardsProps {
  progressUpdates?: any[];
  exercises?: any[];
  contextUsed?: any;
  className?: string;
}

export const ProgressCards: React.FC<ProgressCardsProps> = ({
  progressUpdates = [],
  exercises = [],
  contextUsed,
  className = ''
}) => {
  if (!progressUpdates.length && !exercises.length && !contextUsed) {
    return null;
  }

  return (
    <ProgressCard
      progressUpdates={progressUpdates}
      exercises={exercises}
      contextUsed={contextUsed}
      className={className}
    />
  );
};