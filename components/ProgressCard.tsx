/**
 * ProgressCard component for displaying structured linguistics progress information
 */

import React from 'react';

interface ProgressUpdate {
  category: string;
  level: number;
  description: string;
}

interface Exercise {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface ProgressCardProps {
  progressUpdates?: ProgressUpdate[];
  exercises?: Exercise[];
  contextUsed?: boolean;
  className?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  progressUpdates = [],
  exercises = [],
  contextUsed = false,
  className = '',
}) => {
  const getDifficultyColor = (difficulty: Exercise['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty: Exercise['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return 'Unknown';
    }
  };

  const renderProgressBar = (level: number) => {
    const percentage = Math.min(level * 10, 100); // Assuming level is 1-10
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  if (progressUpdates.length === 0 && exercises.length === 0 && !contextUsed) {
    return null;
  }

  return (
    <div className={`border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Context Used Indicator */}
      {contextUsed && (
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Context-aware response using conversation history</span>
        </div>
      )}

      {/* Progress Updates */}
      {progressUpdates.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-1a1 1 0 100-2h1a4 4 0 014 4v6a4 4 0 01-4 4H6a4 4 0 01-4-4V7a4 4 0 014-4z" clipRule="evenodd" />
            </svg>
            Progress Updates
          </h4>
          <div className="space-y-3">
            {progressUpdates.map((update, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start mb-1">
                  <h5 className="font-medium text-gray-900">{update.category}</h5>
                  <span className="text-sm text-gray-500">Level {update.level}/10</span>
                </div>
                {renderProgressBar(update.level)}
                <p className="text-sm text-gray-600 mt-2">{update.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Exercises */}
      {exercises.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Recommended Exercises
          </h4>
          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <div key={index} className={`border rounded-lg p-3 ${getDifficultyColor(exercise.difficulty)}`}>
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium">{exercise.title}</h5>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(exercise.difficulty)}`}>
                    {getDifficultyLabel(exercise.difficulty)}
                  </span>
                </div>
                <p className="text-sm">{exercise.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accessibility: Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {contextUsed && "This response uses conversation context for better accuracy."}
        {progressUpdates.length > 0 && `You have ${progressUpdates.length} progress updates available.`}
        {exercises.length > 0 && `${exercises.length} exercises have been recommended for practice.`}
      </div>
    </div>
  );
};