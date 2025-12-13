import { useEffect } from 'react';

/**
 * Hook to handle back button press when modal is open
 * Prevents modal from creating browser history entries
 * Instead, back button just closes the modal
 * 
 * Usage:
 * const handleClose = () => setOpen(false);
 * useModalBackButton(open, handleClose);
 */
export const useModalBackButton = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return;

    let hasAddedHistoryEntry = false;

    // When modal opens, push a fake state to history
    // This allows back button to close modal instead of navigating away
    const handlePopState = () => {
      // When back is pressed, just close the modal
      onClose();
      // Don't push state again to avoid loop
      hasAddedHistoryEntry = false;
    };

    // Push a dummy state when modal opens (only once)
    if (!hasAddedHistoryEntry) {
      window.history.pushState({ modalOpen: true }, '', window.location.href);
      hasAddedHistoryEntry = true;
    }

    // Listen for back button (popstate event)
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);
};

export default useModalBackButton;
