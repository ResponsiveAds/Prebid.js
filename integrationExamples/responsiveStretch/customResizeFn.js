function customResizeFn(width, height, frame, doc, bid) {
  console.log('Custom resize function called');
  console.log('Resize dimensions:', width, 'x', height);

  // Custom resize logic - stretch container to 100% screen width
  if (frame) {
      // Set height to maintain original dimensions and prevent page jumping
      if (height) {
          frame.height = height;
          frame.style.height = height + 'px';
      }

      // Set frame width to 100%
      frame.style.width = '100%';
      frame.style.maxWidth = '100%';
      frame.style.boxSizing = 'border-box';      // Traverse up the DOM from the frame element
      if (frame && frame.parentElement) {
          let currentElement = frame.parentElement;
          const maxTraversalDepth = 10; // Prevent infinite loops
          let depth = 0;

          while (currentElement && currentElement !== document.body && depth < maxTraversalDepth) {
              const currentStyle = window.getComputedStyle ?
                  window.getComputedStyle(currentElement) :
                  currentElement.currentStyle;

              // Store original layout metrics before making changes
              const originalScrollHeight = document.documentElement.scrollHeight;
              const originalScrollWidth = document.documentElement.scrollWidth;
              const originalClientHeight = document.documentElement.clientHeight;

              // Store original styles to restore if needed
              const originalWidth = currentElement.style.width;
              const originalMaxWidth = currentElement.style.maxWidth;
              const originalBoxSizing = currentElement.style.boxSizing;

              // Apply the width changes
              currentElement.style.width = '100%';
              currentElement.style.maxWidth = '100%';
              currentElement.style.boxSizing = 'border-box';

              // Force a layout recalculation
              currentElement.offsetHeight;

              // Check if layout was disrupted
              const newScrollHeight = document.documentElement.scrollHeight;
              const newScrollWidth = document.documentElement.scrollWidth;
              const newClientHeight = document.documentElement.clientHeight;

              // Define thresholds for acceptable layout changes
              const heightChangeThreshold = 50; // pixels
              const widthChangeThreshold = 100; // pixels

              const heightChanged = Math.abs(newScrollHeight - originalScrollHeight) > heightChangeThreshold;
              const widthOverflow = newScrollWidth > originalScrollWidth + widthChangeThreshold;
              const viewportChanged = Math.abs(newClientHeight - originalClientHeight) > heightChangeThreshold;

              if (heightChanged || widthOverflow || viewportChanged) {
                  // Layout was disrupted, restore original styles
                  currentElement.style.width = originalWidth;
                  currentElement.style.maxWidth = originalMaxWidth;
                  currentElement.style.boxSizing = originalBoxSizing;

                  console.log('Reverted element due to layout disruption:', currentElement.tagName, currentElement.className, {
                      heightChanged,
                      widthOverflow,
                      viewportChanged,
                      heightDiff: newScrollHeight - originalScrollHeight,
                      widthDiff: newScrollWidth - originalScrollWidth
                  });
                  break; // Stop traversing if layout was disrupted
              } else {
                  console.log('Successfully set width 100% on element:', currentElement.tagName, currentElement.className);
              }

              currentElement = currentElement.parentElement;
              depth++;
          }
      }

      // Log to parent window for debugging
      if (window.parent && window.parent !== window) {
          window.parent.console.log('Ad resized to full width with height:', height, 'px');
      }
  }
}

// Also make it available globally when loaded with a regular script tag
if (typeof window !== 'undefined') {
  window.customResizeFn = customResizeFn;
}
