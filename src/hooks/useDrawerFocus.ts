import { useRef, useEffect } from 'react';

/**
 * Hook to manage focus when opening/closing Radix UI drawers and dialogs
 * @param openId - ID of the currently open drawer/dialog (null if none open)
 * @returns Object with refs and reset function to manage focus
 */
export function useDrawerFocus<T extends HTMLElement = HTMLButtonElement>() {
  const triggerRefs = useRef<Record<string, T | null>>({});
  const closeRefs = useRef<Record<string, T | null>>({});
  const previousOpenId = useRef<string | null>(null);
  
  // Effect to focus the close button when a drawer opens
  useEffect(() => {
    const handleFocusOnOpen = (openId: string | null) => {
      if (openId && closeRefs.current[openId]) {
        setTimeout(() => {
          closeRefs.current[openId]?.focus();
        }, 50); // Small delay to ensure the drawer is mounted
      }
    };
    
    // Setup a MutationObserver to detect when drawers are added to the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          // Check for added drawer content nodes
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement && 
                (node.getAttribute('data-state') === 'open' || 
                 node.classList.contains('drawer-content'))) {
              const drawerIdAttr = node.getAttribute('data-drawer-id');
              if (drawerIdAttr && closeRefs.current[drawerIdAttr]) {
                handleFocusOnOpen(drawerIdAttr);
              }
            }
          });
        }
      });
    });

    // Start observing the document body for drawer-related changes
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Function to handle drawer closing and return focus to trigger
  const handleClose = (id: string | null) => {
    if (id && triggerRefs.current[id]) {
      setTimeout(() => {
        triggerRefs.current[id]?.focus();
      }, 50);
    }
    previousOpenId.current = null;
  };
  
  return {
    triggerRefs,
    closeRefs,
    handleClose,
    setTriggerRef: (id: string, ref: T | null) => {
      triggerRefs.current[id] = ref;
    },
    setCloseRef: (id: string, ref: T | null) => {
      closeRefs.current[id] = ref; 
    }
  };
}

export default useDrawerFocus; 