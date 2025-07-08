'use client';

import React from 'react';
// import { useAccessibilityFixes } from '@/utils/accessibility';

/**
 * Provider component that applies accessibility fixes throughout the app
 * Temporarily disabled to fix login form input issues
 */
export default function AccessibilityProvider({
  children
}: {
  children: React.ReactNode;
}) {
  // Temporarily disabled accessibility fixes
  // useAccessibilityFixes();

  return <>{children}</>;
} 