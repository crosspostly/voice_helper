/**
 * Tests for ProgressCard component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressCard } from '../components/ProgressCard';

describe('ProgressCard', () => {
  it('should render nothing when no data provided', () => {
    const { container } = render(<ProgressCard />);
    expect(container.firstChild).toBeNull();
  });

  it('should render context used indicator', () => {
    render(<ProgressCard contextUsed={true} />);
    
    expect(screen.getByText('Context-aware response using conversation history')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('This response uses conversation context for better accuracy.');
  });

  it('should render progress updates', () => {
    const progressUpdates = [
      {
        category: 'Speaking',
        level: 5,
        description: 'Good progress in speaking skills',
      },
      {
        category: 'Listening',
        level: 3,
        description: 'Needs more practice in listening',
      },
    ];

    render(<ProgressCard progressUpdates={progressUpdates} />);

    expect(screen.getByText('Progress Updates')).toBeInTheDocument();
    expect(screen.getByText('Speaking')).toBeInTheDocument();
    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getByText('Good progress in speaking skills')).toBeInTheDocument();
    expect(screen.getByText('Needs more practice in listening')).toBeInTheDocument();
    expect(screen.getByText('Level 5/10')).toBeInTheDocument();
    expect(screen.getByText('Level 3/10')).toBeInTheDocument();
  });

  it('should render exercises', () => {
    const exercises = [
      {
        title: 'Breathing Exercise',
        description: 'Practice deep breathing techniques',
        difficulty: 'beginner' as const,
      },
      {
        title: 'Advanced Debate',
        description: 'Complex argumentation practice',
        difficulty: 'advanced' as const,
      },
    ];

    render(<ProgressCard exercises={exercises} />);

    expect(screen.getByText('Recommended Exercises')).toBeInTheDocument();
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument();
    expect(screen.getByText('Practice deep breathing techniques')).toBeInTheDocument();
    expect(screen.getByText('Advanced Debate')).toBeInTheDocument();
    expect(screen.getByText('Complex argumentation practice')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('should apply correct difficulty styling', () => {
    const exercises = [
      {
        title: 'Beginner Exercise',
        description: 'Easy practice',
        difficulty: 'beginner' as const,
      },
      {
        title: 'Intermediate Exercise',
        description: 'Medium practice',
        difficulty: 'intermediate' as const,
      },
      {
        title: 'Advanced Exercise',
        description: 'Hard practice',
        difficulty: 'advanced' as const,
      },
    ];

    const { container } = render(<ProgressCard exercises={exercises} />);

    // Check that difficulty badges have correct classes
    const badges = container.querySelectorAll('.rounded-full');
    expect(badges[0]).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
    expect(badges[1]).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-200');
    expect(badges[2]).toHaveClass('bg-red-100', 'text-red-800', 'border-red-200');
  });

  it('should render all content types together', () => {
    const progressUpdates = [
      {
        category: 'Speaking',
        level: 7,
        description: 'Excellent progress',
      },
    ];
    const exercises = [
      {
        title: 'Practice Exercise',
        description: 'Daily practice routine',
        difficulty: 'intermediate' as const,
      },
    ];

    render(
      <ProgressCard
        progressUpdates={progressUpdates}
        exercises={exercises}
        contextUsed={true}
        className="custom-class"
      />
    );

    // Check all sections are present
    expect(screen.getByText('Context-aware response using conversation history')).toBeInTheDocument();
    expect(screen.getByText('Progress Updates')).toBeInTheDocument();
    expect(screen.getByText('Recommended Exercises')).toBeInTheDocument();
    expect(screen.getByText('Speaking')).toBeInTheDocument();
    expect(screen.getByText('Practice Exercise')).toBeInTheDocument();
    expect(screen.getByText('Daily practice routine')).toBeInTheDocument();

    // Check custom className is applied
    const card = screen.getByText('Context-aware response using conversation history').closest('.border');
    expect(card).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    const progressUpdates = [
      {
        category: 'Speaking',
        level: 5,
        description: 'Progress description',
      },
    ];
    const exercises = [
      {
        title: 'Test Exercise',
        description: 'Test description',
        difficulty: 'beginner' as const,
      },
    ];

    render(
      <ProgressCard
        progressUpdates={progressUpdates}
        exercises={exercises}
        contextUsed={true}
      />
    );

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveAttribute('aria-atomic', 'true');
    
    expect(statusRegion).toHaveTextContent('This response uses conversation context for better accuracy.');
    expect(statusRegion).toHaveTextContent('You have 1 progress updates available.');
    expect(statusRegion).toHaveTextContent('1 exercises have been recommended for practice.');
  });

  it('should handle empty progress updates array', () => {
    render(<ProgressCard progressUpdates={[]} contextUsed={true} />);
    
    expect(screen.getByText('Context-aware response using conversation history')).toBeInTheDocument();
    expect(screen.queryByText('Progress Updates')).not.toBeInTheDocument();
  });

  it('should handle empty exercises array', () => {
    render(<ProgressCard exercises={[]} contextUsed={true} />);
    
    expect(screen.getByText('Context-aware response using conversation history')).toBeInTheDocument();
    expect(screen.queryByText('Recommended Exercises')).not.toBeInTheDocument();
  });
});