import * as React from 'react';

/**
 * A utility to replace aria-hidden with inert attribute for better accessibility
 * This helps prevent the "Blocked aria-hidden on an element because its descendant retained focus" error
 */

/**
 * Directly fixes any element with matching selectors that shouldn't have aria-hidden
 */
export function fixAriaHiddenOnMainWrapper(): () => void {
  // Skip in SSR
  if (typeof document === 'undefined') {
    return () => {}; 
  }

  // Fix the specific issue with the main wrapper and date picker buttons
  const fixDatePickerFocusIssue = () => {
    // Direct fix for the specific date picker issue
    const rdpButtons = document.querySelectorAll('.rdp-button, .rdp-button_reset');
    const mainWrapper = document.querySelector('.w-full.max-w-\\[95vw\\].mx-auto.px-4.md\\:px-8');
    
    if (rdpButtons.length > 0 && mainWrapper) {
      // Always ensure the main wrapper doesn't have aria-hidden
      if (mainWrapper.getAttribute('aria-hidden') === 'true') {
        console.log('Fixing aria-hidden on main wrapper (focused date picker)');
        mainWrapper.removeAttribute('aria-hidden');
      }
      
      // Also fix any other container with aria-hidden that contains these buttons
      rdpButtons.forEach(button => {
        let parent = button.parentElement;
        while (parent) {
          if (parent.getAttribute('aria-hidden') === 'true') {
            console.log('Fixing aria-hidden on parent of date picker button');
            parent.removeAttribute('aria-hidden');
            parent.setAttribute('inert', '');
          }
          parent = parent.parentElement;
        }
      });
    }
  };
  
  // For possible main wrapper selectors that should never have aria-hidden
  const selectorsThatShouldNotBeHidden = [
    '.w-full.max-w-\\[95vw\\].mx-auto.px-4.md\\:px-8', // Main wrapper in layout
    '[data-no-aria-hidden="true"]', // Elements explicitly marked as not to be hidden
    '[role="dialog"]', // All dialogs
    '.rdp', // React DayPicker components
    '.rdp-button', // Day picker buttons
    '.rdp-button_reset', // Day picker reset buttons
  ];
  
  // Create direct observer for the main wrapper - urgent fix for the specific issue
  const directlyObserveMainWrapper = () => {
    const mainWrapper = document.querySelector('.w-full.max-w-\\[95vw\\].mx-auto.px-4.md\\:px-8');
    if (mainWrapper) {
      // Initial fix
      if (mainWrapper.getAttribute('aria-hidden') === 'true') {
        console.log('Initial fix: removing aria-hidden on main wrapper');
        mainWrapper.removeAttribute('aria-hidden');
      }
      
      // Create mutation observer specifically for this element
      const wrapperObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
            if (mainWrapper.getAttribute('aria-hidden') === 'true') {
              console.log('MutationObserver: removing aria-hidden on main wrapper');
              mainWrapper.removeAttribute('aria-hidden');
            }
          }
        });
      });
      
      // Start observing the main wrapper for attribute changes
      wrapperObserver.observe(mainWrapper, { 
        attributes: true,
        attributeFilter: ['aria-hidden']
      });
      
      return wrapperObserver;
    }
    return null;
  };
  
  // Function to fix aria-hidden on matching elements
  const fixElementsMatching = () => {
    selectorsThatShouldNotBeHidden.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (element.getAttribute('aria-hidden') === 'true') {
          element.removeAttribute('aria-hidden');
          // Use inert instead if it needs to be hidden
          element.setAttribute('inert', '');
        }
        
        // Also check parents of these elements for aria-hidden
        let parent = element.parentElement;
        while (parent) {
          if (parent.getAttribute('aria-hidden') === 'true') {
            parent.removeAttribute('aria-hidden');
            parent.setAttribute('inert', '');
          }
          parent = parent.parentElement;
        }
      });
    });
    
    // Additional check for any element with a focused element inside it
    document.querySelectorAll('[aria-hidden="true"]').forEach(hiddenElement => {
      // Check if this element contains a focused element
      if (hiddenElement.contains(document.activeElement) && document.activeElement !== document.body) {
        hiddenElement.removeAttribute('aria-hidden');
        hiddenElement.setAttribute('inert', '');
      }
    });
  };
  
  // Run immediate fixes
  fixElementsMatching();
  fixDatePickerFocusIssue();
  
  // Create the specific observer for the main wrapper
  const wrapperObserver = directlyObserveMainWrapper();
  
  // Set up a MutationObserver to track changes
  const observer = new MutationObserver((mutations) => {
    let shouldFix = false;
    
    // Check if any of the mutations might require a fix
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        shouldFix = true;
      } else if (mutation.type === 'childList') {
        shouldFix = true;
      }
    });
    
    if (shouldFix) {
      fixElementsMatching();
      fixDatePickerFocusIssue();
    }
  });
  
  // Observe the entire document for relevant changes
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-hidden'],
    childList: true,
    subtree: true
  });
  
  // Set up a focus event listener to check when focus changes
  const handleFocusChange = () => {
    if (document.activeElement && document.activeElement !== document.body) {
      // If a button from the date picker is focused, make sure the wrapper isn't hidden
      if (document.activeElement.closest('.rdp-button, .rdp-button_reset, .rdp')) {
        // Directly fix the specific issue
        fixDatePickerFocusIssue();
      }
      
      // General fix for focused elements
      fixElementsMatching();
    }
  };
  
  document.addEventListener('focusin', handleFocusChange);
  
  // Create a periodic check to ensure the fix is always applied
  const intervalId = setInterval(() => {
    if (document.querySelector('.rdp-button, .rdp-button_reset')) {
      fixDatePickerFocusIssue();
    }
  }, 500); // Check every half second
  
  return () => {
    observer.disconnect();
    if (wrapperObserver) wrapperObserver.disconnect();
    document.removeEventListener('focusin', handleFocusChange);
    clearInterval(intervalId);
  };
}

/**
 * React hook to use the fix in components
 */
export function useAccessibilityFixes() {
  React.useEffect(() => {
    return fixAriaHiddenOnMainWrapper();
  }, []);
}

/**
 * Accessibility utilities for the application
 */

/**
 * Helper function to safely replace aria-hidden with inert attribute
 * This prevents the "Blocked aria-hidden on an element because its descendant retained focus" error
 * 
 * @param element The DOM element to modify
 */
export const replaceAriaHiddenWithInert = (element: HTMLElement): void => {
  if (!element) return;
  
  // Check if element has aria-hidden
  if (element.hasAttribute('aria-hidden')) {
    const isHidden = element.getAttribute('aria-hidden') === 'true';
    
    // Remove aria-hidden attribute
    element.removeAttribute('aria-hidden');
    
    // Only add inert if it was hidden
    if (isHidden) {
      element.setAttribute('inert', '');
    } else {
      element.removeAttribute('inert');
    }
  }
};

/**
 * Set up a mutation observer to replace aria-hidden with inert attribute
 * @param rootElement Root element to observe
 * @returns MutationObserver instance (disconnect when done)
 */
export const setupAriaHiddenObserver = (rootElement: HTMLElement): MutationObserver | null => {
  if (!rootElement) return null;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const element = mutation.target as HTMLElement;
        replaceAriaHiddenWithInert(element);
      }
    });
  });
  
  observer.observe(rootElement, { 
    attributes: true, 
    subtree: true, 
    attributeFilter: ['aria-hidden'] 
  });
  
  return observer;
}; 