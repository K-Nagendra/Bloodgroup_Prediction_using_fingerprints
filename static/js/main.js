// Drag and drop functionality
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('imageUpload');
        
dropArea.addEventListener('click', () => fileInput.click());
        
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});
        
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
        
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});
        
['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});
        
function highlight() {
    dropArea.style.borderColor = '#e63946';
    dropArea.style.backgroundColor = 'rgba(230, 57, 70, 0.1)';
}
        
function unhighlight() {
    dropArea.style.borderColor = '#a8dadc';
    dropArea.style.backgroundColor = '';
}
        
dropArea.addEventListener('drop', handleDrop, false);
        
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
        fileInput.files = files;
        updateFileName();
    }
}
        
fileInput.addEventListener('change', updateFileName);
        
function updateFileName() {
    if (fileInput.files.length) {
        const fileName = fileInput.files[0].name;
        dropArea.querySelector('h5').textContent = fileName;
        dropArea.querySelector('p').textContent = `${(fileInput.files[0].size / 1024).toFixed(2)} KB`;
        showImagePreview(fileInput.files[0]);
    }
}

function showImagePreview(file) {
    const preview = document.getElementById('imagePreview');
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}
        
// Form submission
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const uploadText = document.getElementById('uploadText');
    const uploadSpinner = document.getElementById('uploadSpinner');
    
    if (!fileInput.files.length) return;
    
    uploadText.textContent = 'Analyzing...';
    uploadSpinner.style.display = 'inline-block';
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Analysis failed');
        
        const result = await response.json();
        displayResults(result);
    } catch (error) {
        alert(error.message);
    } finally {
        uploadText.textContent = 'Analyze Sample';
        uploadSpinner.style.display = 'none';
    }
});
        
function displayResults(data) {
    // Remove predictedGroup text update
    // document.getElementById('predictedGroup').textContent = data.predicted_blood_group;

    const confidenceBars = document.getElementById('confidenceBars');
    confidenceBars.innerHTML = '';

    const passSection = document.getElementById('passSection');
    const failSection = document.getElementById('failSection');

    passSection.innerHTML = '';
    failSection.innerHTML = '';

    let maxConfidence = 0;

    // Sort confidence percentages descending
    const sortedGroups = Object.entries(data.confidence_percentages)
        .sort((a, b) => b[1] - a[1]);

    // Top two are Pass, rest are Fail
    const passGroups = sortedGroups.slice(0, 2);
    const failGroups = sortedGroups.slice(2);

    // Helper to create group item with animation
    function createGroupItem(group, percentage, isPass) {
        const container = document.createElement('div');
        container.className = isPass ? 'pass-group-item mb-3 p-3 rounded shadow-sm' : 'fail-group-item mb-3 p-3 rounded shadow-sm';
        container.style.animation = isPass ? 'fadeSlideInPass 0.8s ease forwards' : 'fadeSlideInFail 0.8s ease forwards';

        const label = document.createElement('div');
        label.className = 'd-flex justify-content-between align-items-center';

        const nameSpan = document.createElement('span');
        nameSpan.className = isPass ? 'fw-bold text-primary' : 'text-muted';
        nameSpan.textContent = group;

        const percentSpan = document.createElement('span');
        percentSpan.textContent = `${percentage.toFixed(2)}%`;

        label.appendChild(nameSpan);
        label.appendChild(percentSpan);
        container.appendChild(label);

        return container;
    }

    passGroups.forEach(([group, percentage], index) => {
        if (percentage > maxConfidence) maxConfidence = percentage;
        passSection.appendChild(createGroupItem(group, percentage, true));
    });

    failGroups.forEach(([group, percentage], index) => {
        failSection.appendChild(createGroupItem(group, percentage, false));
    });

    // Build confidence bars as before
    for (const [group, percentage] of Object.entries(data.confidence_percentages)) {
        if (percentage > maxConfidence) maxConfidence = percentage;

        const barContainer = document.createElement('div');
        barContainer.className = 'mb-3';

        const label = document.createElement('div');
        label.className = 'd-flex justify-content-between mb-1';
        label.innerHTML = `
            <span class="fw-bold">${group}</span>
            <span>${percentage.toFixed(2)}%</span>
        `;

        const progress = document.createElement('div');
        progress.className = 'progress';
        progress.innerHTML = `
            <div class="progress-bar" role="progressbar" 
                 style="width: ${percentage}%" 
                 aria-valuenow="${percentage}" 
                 aria-valuemin="0" 
                 aria-valuemax="100"></div>
        `;

        barContainer.appendChild(label);
        barContainer.appendChild(progress);
        confidenceBars.appendChild(barContainer);
    }

    document.getElementById('confidenceValue').textContent = `${maxConfidence.toFixed(2)}%`;
    document.getElementById('resultContainer').style.display = 'block';
    window.scrollTo({
        top: document.getElementById('resultContainer').offsetTop - 20,
        behavior: 'smooth'
    });
}
        
function resetForm() {
    document.getElementById('uploadForm').reset();
    document.getElementById('resultContainer').style.display = 'none';
    dropArea.querySelector('h5').textContent = 'Drag & Drop or Click to Browse';
    dropArea.querySelector('p').textContent = 'Supported formats: JPG, PNG, BMP';
    const preview = document.getElementById('imagePreview');
    preview.src = '';
    preview.style.display = 'none';
}
