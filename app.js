// GT Pro - Application File Manager (IndexedDB powered for reliable storage & download)
const DB_NAME = 'GTProDB';
const DB_VERSION = 1;
const STORE_NAME = 'files';

let db = null;

// IndexedDB Init
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => {
      console.error('IndexedDB error:', e);
      reject(e);
    };
  });
};

// Database operations
const getAllFilesFromDB = () => {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (err) {
      console.error('Fetch error:', err);
      resolve([]);
    }
  });
};

const saveFileToDB = (fileRecord) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(fileRecord);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e);
    } catch (err) {
      reject(err);
    }
  });
};

const deleteFileFromDB = (id) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    } catch (err) {
      reject(err);
    }
  });
};

// UI Elements
const uploadModal = document.getElementById('uploadModal');
const openUploadModal = document.getElementById('openUploadModal');
const closeModal = document.getElementById('closeModal');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const uploadForm = document.getElementById('uploadForm');
const filesGrid = document.getElementById('filesGrid');
const customFileNameInput = document.getElementById('customFileNameInput');
const versionInput = document.getElementById('versionInput');
const submitBtn = document.getElementById('submitBtn');

let selectedFileBlob = null;
let currentFiles = [];

// Format helper
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const renderFiles = async () => {
  currentFiles = await getAllFilesFromDB();

  const countEl = document.getElementById('totalFilesCount');
  if (countEl) countEl.textContent = currentFiles.length;

  if (currentFiles.length === 0) {
    filesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        </div>
        <p class="empty-title">No application files uploaded yet</p>
        <span class="empty-desc">Click "Upload File" above to add your first APK, package, or build file.</span>
      </div>`;
    return;
  }

  filesGrid.innerHTML = currentFiles.map((f) => `
    <div class="file-item" data-id="${f.id}">
      <div class="file-item-left">
        <div class="file-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="file-info">
          <span class="file-name" title="${f.name}">${f.name}</span>
          <div class="file-meta">
            <span class="version-tag">${f.version}</span>
            <span class="dot-separator">•</span>
            <span>${f.size}</span>
            <span class="dot-separator">•</span>
            <span>${f.date || 'Recently added'}</span>
          </div>
        </div>
      </div>
      <div class="file-actions">
        <button type="button" class="btn btn-sm btn-download" onclick="triggerDownload(${f.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download</span>
        </button>
        <button type="button" class="btn btn-sm btn-delete" onclick="triggerDelete(${f.id})" title="Delete file">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
};

// Global download handler
window.triggerDownload = (id) => {
  const file = currentFiles.find(item => item.id === id);
  if (!file || !file.blob) {
    alert('File could not be found or data is missing.');
    return;
  }

  try {
    const blobUrl = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = file.name || 'download';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 200);
  } catch (err) {
    console.error('Download error:', err);
    alert('Failed to trigger download: ' + err.message);
  }
};

// Global delete handler
window.triggerDelete = async (id) => {
  const file = currentFiles.find(item => item.id === id);
  const fileName = file ? file.name : 'this file';
  if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
    try {
      await deleteFileFromDB(id);
      await renderFiles();
    } catch (err) {
      alert('Failed to delete file.');
    }
  }
};

// Modal handlers
const showModal = () => {
  uploadModal.classList.add('open');
};

const hideModal = () => {
  uploadModal.classList.remove('open');
  uploadForm.reset();
  selectedFileBlob = null;
  fileNameDisplay.textContent = 'No file selected';
  dropZone.classList.remove('has-file');
};

openUploadModal.addEventListener('click', showModal);
closeModal.addEventListener('click', hideModal);

uploadModal.addEventListener('click', (e) => {
  if (e.target === uploadModal) hideModal();
});

// Dropzone click & propagation
dropZone.addEventListener('click', (e) => {
  if (e.target !== fileInput) {
    fileInput.click();
  }
});

fileInput.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Drag & drop support
['dragenter', 'dragover'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });
});

const handleFileSelect = (file) => {
  if (!file) return;
  selectedFileBlob = file;
  fileNameDisplay.textContent = `${file.name} (${formatFileSize(file.size)})`;
  dropZone.classList.add('has-file');

  if (!customFileNameInput.value) {
    customFileNameInput.value = file.name;
  }
  if (!versionInput.value) {
    versionInput.value = 'v1.0.0';
  }
};

dropZone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  if (dt && dt.files && dt.files.length > 0) {
    handleFileSelect(dt.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileSelect(e.target.files[0]);
  }
});

// Upload submit handler
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedFileBlob && (!fileInput.files || !fileInput.files[0])) {
    alert('Please select a file to upload first.');
    return;
  }

  const file = selectedFileBlob || fileInput.files[0];
  const customName = customFileNameInput.value.trim() || file.name;
  const version = versionInput.value.trim() || 'v1.0.0';

  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  try {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const fileRecord = {
      name: customName,
      version: version,
      size: formatFileSize(file.size),
      date: today,
      blob: file,
      type: file.type || 'application/octet-stream'
    };

    await saveFileToDB(fileRecord);
    hideModal();
    await renderFiles();
  } catch (err) {
    console.error('Upload error:', err);
    alert('Failed to save file: ' + (err.message || 'Storage error'));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload File';
  }
});

// Initialize on page load
initDB().then(async () => {
  // Check if initial sample is needed for demonstration when completely fresh
  const existing = await getAllFilesFromDB();
  if (existing.length === 0) {
    // Add default starter file so repository is immediately usable and tested
    const sampleContent = new Blob(['GT Pro Management Application Package v1.0.0'], { type: 'text/plain' });
    await saveFileToDB({
      name: 'gt-pro-release.apk',
      version: 'v1.0.0',
      size: '24.5 MB',
      date: 'Today',
      blob: sampleContent,
      type: 'application/vnd.android.package-archive'
    });
  }
  await renderFiles();
}).catch((err) => {
  console.error('DB initialization failed:', err);
  filesGrid.innerHTML = `<div class="empty-state">Database error: Could not initialize local storage.</div>`;
});
