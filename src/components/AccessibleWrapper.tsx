"use client"

import React, { useEffect, ReactNode } from 'react';
import { useAccessibilityFixes } from '@/utils/accessibility';

interface AccessibleWrapperProps {
  children: ReactNode;
}

/**
 * A component that applies accessibility fixes to its children
 * This is used to wrap the main content of the page
 */
const AccessibleWrapper: React.FC<AccessibleWrapperProps> = ({ children }) => {
  // Apply accessibility fixes
  useAccessibilityFixes();
  
  // Add extra protection for main wrapper
  useEffect(() => {
    // Find and protect the main wrapper element
    const mainWrapper = document.querySelector('.w-full.max-w-\\[95vw\\].mx-auto');
    if (mainWrapper) {
      mainWrapper.setAttribute('data-no-aria-hidden', 'true');
    }
    
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  return (
    <div className="accessible-root" data-no-aria-hidden="true">
      {children}
    </div>
  );
};

export default AccessibleWrapper; 