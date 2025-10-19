import React from 'react';

interface MainEditorLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  hasSuggestions: boolean;
  className?: string;
}



export const MainEditorLayout: React.FC<MainEditorLayoutProps> = ({
  children,
  sidebar,
  hasSuggestions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col xl:flex-row gap-6 ${className}`}>
      {/* Main content area - flexible width on desktop, full width on mobile/tablet */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Sidebar - fixed width on desktop (320px), stacked below on mobile/tablet */}
      {hasSuggestions && (
        <>
          {/* Mobile/Tablet: Show sidebar below content */}
          <div className="xl:hidden">
            {sidebar}
          </div>

          {/* Desktop: Show sidebar on right with fixed width */}
          <div className="hidden xl:block w-80 flex-shrink-0">
            {sidebar}
          </div>
        </>
      )}
    </div>
  );
};

MainEditorLayout.displayName = 'MainEditorLayout';
