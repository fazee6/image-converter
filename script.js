document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const uploadPage = document.getElementById('upload-page');
    const conversionPage = document.getElementById('conversion-page');
    const fileList = document.getElementById('fileList');
    const addMoreBtn = document.getElementById('addMore');
    const clearAllBtn = document.getElementById('clearAll');
    const convertAllBtn = document.getElementById('convertAll');
    const outputFormatSelect = document.getElementById('outputFormat');
    const formatGrid = document.querySelector('.format-grid');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressContainer = document.getElementById('progressContainer');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const queuePositionContainer = document.getElementById('queuePositionContainer');
    const queuePositionText = document.getElementById('queuePositionText');

    const supportedFormats = [
        'JPEG', 'PNG', 'GIF', 'WEBP', 'BMP', 'TIFF', 'HEIC', 'SVG', 'TGA',
        'PSD', 'EPS', 'AVIF', 'PDF', 'EXR', 'HDR', 'CR2', 'NEF', 'DNG', 'ARW',
        'ORF', 'XBM', 'WBMP', 'DICOM', 'RAS', 'PGM', 'PBM', 'JBIG', 'CIN', 'DPX',
        'RLA', 'VICAR', 'DJVU', 'FL32', 'MNG', 'PCX', 'PPM', 'XPM', 'CUT', 'PALM',
        'PICT', 'FAX', 'XWD', 'INFO', 'RAD', 'SUN', 'PWP', 'FPX', 'HRZ', 'MAN'
    ];

    let files = [];
    let ws;
    let wsId;

    // Initialize WebSocket connection
    function initWebSocket() {
        ws = new WebSocket('wss://' + window.location.host);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') {
                wsId = data.id;
            } else if (data.type === 'progress') {
                updateProgress(data.message);
            } else if (data.type === 'queuePosition') {
                updateQueuePosition(data.position);
            } else if (data.type === 'error') {
                alert(data.message);
                hideProgress();
                hideQueuePosition();
            }
        };
    }

    initWebSocket();

    // Dark mode toggle with persistence
    function setDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        darkModeToggle.checked = isDark;
        localStorage.setItem('darkMode', isDark);
    }

    // Initialize dark mode from local storage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
        setDarkMode(savedDarkMode === 'true');
    }

    darkModeToggle.addEventListener('change', () => {
        setDarkMode(darkModeToggle.checked);
    });

    // Populate format grid and output format select
    supportedFormats.forEach(format => {
        const button = document.createElement('button');
        button.textContent = format;
        button.classList.add('btn', 'btn-outline-primary');
        button.addEventListener('click', () => {
            outputFormatSelect.value = format;
            updateConversionTitle();
        });
        formatGrid.appendChild(button);

        // Add option to output format select
        const outputOption = document.createElement('option');
        outputOption.value = format;
        outputOption.textContent = format;
        outputFormatSelect.appendChild(outputOption);
    });

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropArea.addEventListener('drop', handleDrop, false);
    dropArea.addEventListener('click', () => fileInput.click());

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const newFiles = [...dt.files];
        handleFiles(newFiles);
    }

    // File input functionality
    fileInput.addEventListener('change', (e) => {
        const newFiles = [...e.target.files];
        handleFiles(newFiles);
    });

    function handleFiles(newFiles) {
        if (files.length + newFiles.length > 5) {
            alert('You can only upload a maximum of 5 files at a time.');
            return;
        }
        
        const oversizedFiles = newFiles.filter(file => file.size > 5 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            alert('The following files exceed the 5MB size limit and will not be added:\n' + 
                  oversizedFiles.map(file => file.name).join('\n'));
            newFiles = newFiles.filter(file => file.size <= 5 * 1024 * 1024);
        }
        
        files = [...files, ...newFiles];
        updateFileList();
        showConversionPage();
        updateConversionTitle();
    }

    function updateFileList() {
        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.classList.add('file-item');
            fileItem.innerHTML = `
                <div class="file-info">
                    <img src="file-icon.svg" alt="File icon" class="file-icon">
                    <div class="file-details">
                        <p class="file-name">${file.name}</p>
                        <p class="file-size">${formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button class="remove-file btn btn-danger btn-sm" data-index="${index}">×</button>
            `;
            fileList.appendChild(fileItem);
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-file').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                files.splice(index, 1);
                updateFileList();
                if (files.length === 0) {
                    showUploadPage();
                }
            });
        });
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function showConversionPage() {
        uploadPage.style.display = 'none';
        conversionPage.style.display = 'block';
    }

    function showUploadPage() {
        uploadPage.style.display = 'block';
        conversionPage.style.display = 'none';
    }

    // Add More button functionality
    addMoreBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Clear All button functionality
    clearAllBtn.addEventListener('click', () => {
        files = [];
        updateFileList();
        showUploadPage();
    });

    // Convert All button functionality
    convertAllBtn.addEventListener('click', () => {
        const outputFormat = outputFormatSelect.value;
        if (!outputFormat) {
            alert('Please select an output format');
            return;
        }
        
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        formData.append('format', outputFormat);
        formData.append('wsId', wsId);

        resetProgress();
        showProgress();
        showQueuePosition();

        fetch('/convert', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Conversion failed');
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = files.length > 1 ? 'converted_images.zip' : `converted_image.${outputFormat.toLowerCase()}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            hideProgress();
            hideQueuePosition();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during conversion. Please try again.');
            hideProgress();
            hideQueuePosition();
        });
    });

    // Update conversion title when output format changes
    outputFormatSelect.addEventListener('change', updateConversionTitle);

    function updateConversionTitle() {
        const titleElement = document.querySelector('#conversion-page h2');
        titleElement.textContent = `Convert to ${outputFormatSelect.value}`;
    }

    function updateProgress(message) {
        progressText.textContent = message;
        const progress = parseInt(progressBar.style.width) || 0;
        progressBar.style.width = `${Math.min(progress + 5, 100)}%`;
        progressBar.setAttribute('aria-valuenow', Math.min(progress + 5, 100));
    }

    function resetProgress() {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
        progressText.textContent = 'Starting conversion...';
    }

    function showProgress() {
        progressContainer.style.display = 'block';
        progressText.style.display = 'block';
    }

    function hideProgress() {
        progressContainer.style.display = 'none';
        progressText.style.display = 'none';
    }

    function updateQueuePosition(position) {
        queuePositionText.textContent = `Your position in queue: ${position}`;
    }

    function showQueuePosition() {
        queuePositionContainer.style.display = 'block';
    }

    function hideQueuePosition() {
        queuePositionContainer.style.display = 'none';
    }
});