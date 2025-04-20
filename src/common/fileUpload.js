// Common file upload utility for all tools
// 
// Usage:
// initFileUpload({
//   dropZoneId: 'dropZone',           // ID of the drop zone element
//   fileInputId: 'fileInput',         // ID of the file input element
//   acceptTypes: 'video/*',           // Optional. Default: '*/*'
//   onFileSelected: (file) => {...},  // Callback when file is selected
//   hideDropZoneOnSelect: true        // Optional. Default: true
// });

export function initFileUpload(options) {
  const {
    dropZoneId,
    fileInputId,
    acceptTypes = '*/*',
    onFileSelected,
    hideDropZoneOnSelect = true
  } = options;

  // Get elements
  const dropZone = document.getElementById(dropZoneId);
  const fileInput = document.getElementById(fileInputId);
  const fileSelectBtn = dropZone ? dropZone.querySelector('.file-select-btn') : null;
  
  if (!dropZone || !fileInput) {
    console.error(`Could not find elements: dropZone=${!!dropZone}, fileInput=${!!fileInput}`);
    return () => {};
  }
  
  // Set accept attribute
  if (acceptTypes) {
    fileInput.accept = acceptTypes;
  }
  
  // Handle file selection
  function handleFile(file) {
    if (!file) return;
    
    // Check file type if acceptTypes specified
    if (acceptTypes !== '*/*' && !file.type.match(new RegExp(acceptTypes.replace('*/', '').replace(/,/g, '|')))) {
      console.error(`File type ${file.type} not accepted`);
      return;
    }
    
    // Hide drop zone if needed
    if (hideDropZoneOnSelect) {
      dropZone.style.display = 'none';
    }
    
    // Call callback
    if (typeof onFileSelected === 'function') {
      onFileSelected(file);
    }
  }
  
  // Drag and drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  }
  
  function handleDragLeave() {
    dropZone.classList.remove('dragover');
  }
  
  function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }
  
  // Click handler for select button
  function handleSelectClick(e) {
    e.stopPropagation();
    fileInput.click();
  }
  
  // Change handler for file input
  function handleFileInputChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }
  
  // Add event listeners
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);
  
  // Add click handler only to the button
  if (fileSelectBtn) {
    fileSelectBtn.addEventListener('click', handleSelectClick);
  }
  
  fileInput.addEventListener('change', handleFileInputChange);
  
  // Return cleanup function
  return function cleanup() {
    dropZone.removeEventListener('dragover', handleDragOver);
    dropZone.removeEventListener('dragleave', handleDragLeave);
    dropZone.removeEventListener('drop', handleDrop);
    
    if (fileSelectBtn) {
      fileSelectBtn.removeEventListener('click', handleSelectClick);
    }
    
    fileInput.removeEventListener('change', handleFileInputChange);
  };
} 