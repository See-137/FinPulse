import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width = '100%',
  height = variant === 'text' ? '1rem' : '100%',
  className = '',
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`pulse-skeleton ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      role="status"
      aria-label="Loading"
    />
  );
};

// Pre-configured skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLoader
        key={i}
        variant="text"
        width={i === lines - 1 ? '70%' : '100%'}
        height="0.875rem"
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`card-surface p-6 rounded-2xl space-y-4 ${className}`}>
    <div className="flex items-center gap-3">
      <SkeletonLoader variant="circular" width="3rem" height="3rem" />
      <div className="flex-1 space-y-2">
        <SkeletonLoader variant="text" width="40%" height="1rem" />
        <SkeletonLoader variant="text" width="60%" height="0.75rem" />
      </div>
    </div>
    <SkeletonLoader variant="rectangular" width="100%" height="8rem" />
    <div className="flex gap-2">
      <SkeletonLoader variant="rectangular" width="30%" height="2rem" />
      <SkeletonLoader variant="rectangular" width="30%" height="2rem" />
    </div>
  </div>
);

export const SkeletonForm: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-2">
        <SkeletonLoader variant="text" width="30%" height="0.75rem" />
        <SkeletonLoader variant="rectangular" width="100%" height="3rem" />
      </div>
    ))}
    <SkeletonLoader variant="rectangular" width="100%" height="3.5rem" />
  </div>
);
