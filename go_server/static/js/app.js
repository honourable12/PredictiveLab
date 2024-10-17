document.addEventListener('DOMContentLoaded', (event) => {
    // Form validation for registration and login
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('border-red-500');
                } else {
                    field.classList.remove('border-red-500');
                }
            });
            if (!isValid) {
                e.preventDefault();
                alert('Please fill in all required fields.');
            }
        });
    });

    // Fetch and display column names for selected dataset in train form
    const datasetSelect = document.getElementById('dataset_id');
    const targetColumnInput = document.getElementById('target_column');
    if (datasetSelect && targetColumnInput) {
        datasetSelect.addEventListener('change', async (e) => {
            const datasetId = e.target.value;
            try {
                const response = await fetch(`/api/datasets/${datasetId}/columns`);
                const columns = await response.json();
                const datalist = document.getElementById('column-list');
                datalist.innerHTML = '';
                columns.forEach(column => {
                    const option = document.createElement('option');
                    option.value = column;
                    datalist.appendChild(option);
                });
                targetColumnInput.setAttribute('list', 'column-list');
            } catch (error) {
                console.error('Error fetching columns:', error);
            }
        });
    }

    // Toggle visibility of prediction result
    const predictionResult = document.getElementById('prediction-result');
    const toggleResult = document.getElementById('toggle-result');
    if (predictionResult && toggleResult) {
        toggleResult.addEventListener('click', () => {
            predictionResult.classList.toggle('hidden');
            toggleResult.textContent = predictionResult.classList.contains('hidden') ? 'Show Result' : 'Hide Result';
        });
    }
});