document.addEventListener('DOMContentLoaded', () => {
  const openUploadModalBtn = document.getElementById('open-upload-modal');
  const uploadModal = document.getElementById('upload-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drop-zone');
  const fileNameDisplay = document.getElementById('file-name-display');
  const appNameInput = document.getElementById('app-name');
  const appVersionInput = document.getElementById('app-version');
  const appCategorySelect = document.getElementById('app-category');
  const searchInput = document.getElementById('search-input');
  const filesList = document.getElementById('files-list');
  const fileCount = document.getElementById('file-count');

  let files = [];
  let selectedDroppedFile = null;

  // Load from localStorage safely
  try {
    const savedFiles = localStorage.getItem('gt_pro_files');
    if (savedFiles) {
      files = JSON.parse(savedFiles);
    }
  } catch (err) {
    console.error('Failed to load files from storage:', err);
    files = [];
  }

  // Initial render
  renderFiles('');

  // Modal handlers
  if (openUploadModalBtn && uploadModal) {
    openUploadModalBtn.addEventListener('click', () => {
      uploadModal.classList.add('active');
    });
  }

  if (closeModalBtn && uploadModal) {
    closeModalBtn.addEventListener('click', () => {
      uploadModal.classList.remove('active');
    });
  }

  if (cancelModalBtn && uploadModal) {
    cancelModalBtn.addEventListener('click', () => {
      uploadModal.classList.remove('active');
    });
  }

  if (uploadModal) {
    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) {
        uploadModal.classList.remove('active');
      }
    });
  }

  // File input change
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      try {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          selectedDroppedFile = file;
          if (fileNameDisplay) fileNameDisplay.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
          if (appNameInput && !appNameInput.value) {
            appNameInput.value = file.name.replace(/\.[^/.]+$/, "");
          }
        } else {
          if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen';
        }
      } catch (err) {
        console.error('File input error:', err);
      }
    });
  }

  // Drag and drop effects
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('highlight');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('highlight');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      try {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          selectedDroppedFile = dt.files[0];
          if (fileNameDisplay) fileNameDisplay.textContent = selectedDroppedFile.name + ' (' + formatFileSize(selectedDroppedFile.size) + ')';
          if (appNameInput && !appNameInput.value) {
            appNameInput.value = selectedDroppedFile.name.replace(/\.[^/.]+$/, "");
          }
        }
      } catch (err) {
        console.error('Drop error:', err);
      }
    });
  }

  // Search filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderFiles(e.target.value);
    });
  }

  // Form Submission
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const fileToUpload = selectedDroppedFile || (fileInput && fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null);

        if (!fileToUpload) {
          alert('Please select a file to upload.');
          return;
        }

        const reader = new FileReader();
        reader.onload = function(uploadEvent) {
          const base64Data = uploadEvent.target.result;

          const newFileObj = {
            id: Date.now(),
            name: appNameInput && appNameInput.value.trim() ? appNameInput.value.trim() : fileToUpload.name,
            originalName: fileToUpload.name,
            version: appVersionInput && appVersionInput.value.trim() ? appVersionInput.value.trim() : '1.0.0',
            category: appCategorySelect ? appCategorySelect.value : 'Application',
            size: formatFileSize(fileToUpload.size),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            fileData: base64Data,
            fileType: fileToUpload.type || 'application/octet-stream'
          };

          files.unshift(newFileObj);
          persistFiles();

          renderFiles(searchInput ? searchInput.value : '');
          uploadForm.reset();
          selectedDroppedFile = null;
          if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen';
          if (fileInput) fileInput.value = '';
          if (uploadModal) uploadModal.classList.remove('active');
        };

        reader.onerror = function(error) {
          console.error('FileReader error:', error);
          alert('Failed to read the file.');
        };

        reader.readAsDataURL(fileToUpload);
      } catch (err) {
        console.error('Submission error:', err);
      }
    });
  }

  function persistFiles() {
    try {
      localStorage.setItem('gt_pro_files', JSON.stringify(files));
    } catch (err) {
      console.error('Failed to save files to storage:', err);
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function renderFiles(filter = '') {
    if (!filesList) return;

    const filtered = files.filter(f => 
      f.name.toLowerCase().includes(filter.toLowerCase()) || 
      f.category.toLowerCase().includes(filter.toLowerCase()) ||
      f.originalName.toLowerCase().includes(filter.toLowerCase())
    );

    if (fileCount) {
      fileCount.textContent = `${files.length} file${files.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      filesList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <p>No application files found</p>
          <span>Use the upload button above to add your first application file.</span>
        </div>
      `;
      return;
    }

    filesList.innerHTML = filtered.map(file => `
      <div class="file-item" data-id="${file.id}">
        <div class="file-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
        </div>
        <div class="file-details">
          <div class="file-title-row">
            <h4>${escapeHtml(file.name)}</h4>
            <span class="file-badge">${escapeHtml(file.category)}</span>
          </div>
          <div class="file-meta">
            <span>v${escapeHtml(file.version)}</span>
            <span>•</span>
            <span>${escapeHtml(file.size)}</span>
            <span>•</span>
            <span>${escapeHtml(file.date)}</span>
          </div>
        </div>
        <div class="file-actions">
          <button class="icon-btn file-download-btn" data-id="${file.id}" title="Download file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="icon-btn file-delete-btn" data-id="${file.id}" title="Delete file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.file-download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.getAttribute('data-id'));
        const fileObj = files.find(f => f.id === id);
        if (fileObj && fileObj.fileData) {
          const a = document.createElement('a');
          a.href = fileObj.fileData;
          a.download = fileObj.originalName || fileObj.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      });
    });

    document.querySelectorAll('.file-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.getAttribute('data-id'));
        if (confirm('Are you sure you want to delete this application file?')) {
          files = files.filter(f => f.id !== id);
          persistFiles();
          renderFiles(searchInput ? searchInput.value : '');
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
