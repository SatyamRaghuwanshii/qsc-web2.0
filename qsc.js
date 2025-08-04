document.addEventListener('DOMContentLoaded', () => {
    const materialTypeSelect = document.getElementById('materialType');
    const concreteInputs = document.getElementById('concreteInputs');
    const brickInputs = document.getElementById('brickInputs');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsDiv = document.getElementById('results');

    const projectNameInput = document.getElementById('projectNameInput');
    const saveProjectBtn = document.getElementById('saveProjectBtn');
    const saveMessageDiv = document.getElementById('saveMessage');

    const projectListSelect = document.getElementById('projectList');
    const loadProjectBtn = document.getElementById('loadProjectBtn');
    const refreshProjectsBtn = document.getElementById('refreshProjectsBtn');
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    const loadMessageDiv = document.getElementById('loadMessage');

    const projectCalculationsSection = document.getElementById('projectCalculationsSection');
    const projectCalculationsList = document.getElementById('projectCalculationsList');
    const currentProjectCalculationsCount = document.getElementById('currentProjectCalculationsCount');
    const addCalculationToProjectBtn = document.getElementById('addCalculationToProjectBtn');
    const clearCurrentFormBtn = document.getElementById('clearCurrentFormBtn');
    const startNewProjectBtn = document.getElementById('startNewProjectBtn');
    const calculationsListMessage = document.getElementById('calculationsListMessage');
    const generateReportBtn = document.getElementById('generateReportBtn'); // NEW: Generate Report Button
    const generatePDFReportBtn = document.getElementById('generatePDFReportBtn'); // NEW: Generate PDF Report Button

    let currentLoadedProjectName = null;
    let currentProjectData = { calculations: [] };
    let currentEditingCalculationId = null;

    const materialPrices = {
        'cement_bags': 400,
        'sand_m3': 2500,
        'aggregate_m3': 1800,
        'bricks_nos': 12,
    };

    function displayCalculationsListMessage(message, isSuccess) {
        calculationsListMessage.textContent = message;
        calculationsListMessage.className = 'message-area';
        if (isSuccess) {
            calculationsListMessage.classList.add('success');
        } else {
            calculationsListMessage.classList.add('error');
        }
        setTimeout(() => {
            calculationsListMessage.textContent = '';
            calculationsListMessage.className = 'message-area';
        }, 5000);
    }

    function showInputsForMaterial(selectedMaterial) {
        concreteInputs.classList.add('hidden');
        brickInputs.classList.add('hidden');

        if (selectedMaterial === 'concrete') {
            concreteInputs.classList.remove('hidden');
        } else if (selectedMaterial === 'bricks') {
            brickInputs.classList.remove('hidden');
        }
        resultsDiv.innerHTML = '';
        saveMessageDiv.innerHTML = '';
        loadMessageDiv.innerHTML = '';
        calculationsListMessage.innerHTML = '';
    }

    function displayProjectCalculations() {
        projectCalculationsList.innerHTML = '';
        currentProjectCalculationsCount.textContent = currentProjectData.calculations.length;

        if (currentProjectData.calculations.length === 0) {
            projectCalculationsList.innerHTML = '<p>No calculations added yet for this project.</p>';
            return;
        }

        currentProjectData.calculations.forEach(calc => {
            const calcItem = document.createElement('div');
            calcItem.className = 'calculation-item';
            if (currentEditingCalculationId === calc._id) {
                calcItem.classList.add('selected');
            }
            if (calc._id) {
                calcItem.dataset.id = calc._id;
            } else {
                console.warn("Calculation item missing _id:", calc);
            }

            const calcName = calc.name || 'Untitled Calculation';
            const calcType = calc.type || 'unknown';

            calcItem.innerHTML = `
                <div class="calculation-item-info">
                    <strong>${calcName}</strong> (${calcType})<br>
                    Waste: ${calc.wasteFactor || 0}%
                    ${calc.calculated && typeof calc.calculated.totalBricks !== 'undefined' ? ` | Bricks: ${calc.calculated.totalBricks}` : ''}
                    ${calc.calculated && typeof calc.calculated.cementBags !== 'undefined' ? ` | Cement: ${calc.calculated.cementBags.toFixed(1)} bags` : ''}
                    ${calc.calculated && typeof calc.calculated.wetVolume !== 'undefined' ? ` | Vol: ${calc.calculated.wetVolume.toFixed(2)} m³` : ''}
                </div>
                <div class="calculation-item-actions">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;

            projectCalculationsList.appendChild(calcItem);
        });

        projectCalculationsList.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const calcId = event.target.closest('.calculation-item').dataset.id;
                editCalculation(calcId);
            });
        });

        projectCalculationsList.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const calcId = event.target.closest('.calculation-item').dataset.id;
                deleteCalculation(calcId);
            });
        });
    }

    showInputsForMaterial(materialTypeSelect.value);


    function calculateConcrete() {
        const length = parseFloat(document.getElementById('length').value);
        const width = parseFloat(document.getElementById('width').value);
        const height = parseFloat(document.getElementById('height').value);
        const concreteMixInput = document.getElementById('concreteMix').value;
        const wasteFactor = parseFloat(document.getElementById('wasteFactor').value) || 0;

        if (isNaN(length) || isNaN(width) || isNaN(height) || length <= 0 || width <= 0 || height <= 0) {
            resultsDiv.innerHTML = '<p class="error-message">Please enter valid positive dimensions (Length, Width, Height).</p>';
            return null;
        }
        if (wasteFactor < 0 || wasteFactor > 100) {
            resultsDiv.innerHTML = '<p class="error-message">Waste factor must be between 0 and 100.</p>';
            return null;
        }

        const mixParts = concreteMixInput.split(':').map(part => parseFloat(part.trim()));
        if (mixParts.length !== 3 || mixParts.some(isNaN) || mixParts.some(part => part <= 0)) {
            resultsDiv.innerHTML = '<p class="error-message">Please enter a valid concrete mix ratio (e.g., 1:2:4).</p>';
            return null;
        }

        const [cementPart, sandPart, aggregatePart] = mixParts;
        const sumOfParts = cementPart + sandPart + aggregatePart;

        const wetVolume = length * width * height;
        const dryVolume = wetVolume * 1.54;

        const cementVolume = (cementPart / sumOfParts) * dryVolume;
        const sandVolume = (sandPart / sumOfParts) * dryVolume;
        const aggregateVolume = (aggregatePart / sumOfParts) * dryVolume;

        const cementInKg = cementVolume * 1440;
        let cementBagsInitial = cementInKg / 50;

        const actualWetVolume = wetVolume * (1 + wasteFactor / 100);
        const actualDryVolume = dryVolume * (1 + wasteFactor / 100);
        const actualCementVolume = cementVolume * (1 + wasteFactor / 100);
        const actualSandVolume = sandVolume * (1 + wasteFactor / 100);
        const actualAggregateVolume = aggregateVolume * (1 + wasteFactor / 100);
        const actualCementBags = cementBagsInitial * (1 + wasteFactor / 100);

        return {
            type: 'concrete',
            name: 'Concrete Calculation',
            length: length,
            width: width,
            height: height,
            wasteFactor: wasteFactor,
            concreteMix: concreteMixInput,
            calculated: {
                wetVolume: actualWetVolume,
                dryVolume: actualDryVolume,
                cementVolume: actualCementVolume,
                sandVolume: actualSandVolume,
                aggregateVolume: actualAggregateVolume,
                cementBags: actualCementBags,
            }
        };
    }

    function calculateBricks() {
        const wallLength = parseFloat(document.getElementById('brickWallLength').value);
        const wallHeight = parseFloat(document.getElementById('brickWallHeight').value);
        const wallThickness = parseFloat(document.getElementById('brickWallThickness').value);
        const mortarMixInput = document.getElementById('mortarMix').value;
        const brickSizeLength = parseFloat(document.getElementById('brickSizeLength').value);
        const brickSizeWidth = parseFloat(document.getElementById('brickSizeWidth').value);
        const brickSizeHeight = parseFloat(document.getElementById('brickSizeHeight').value);
        const mortarJointThickness = parseFloat(document.getElementById('mortarJointThickness').value);
        const wasteFactor = parseFloat(document.getElementById('brickWasteFactor').value) || 0;

        if (isNaN(wallLength) || isNaN(wallHeight) || isNaN(wallThickness) || wallLength <= 0 || wallHeight <= 0 || wallThickness <= 0) {
            resultsDiv.innerHTML = '<p class="error-message">Please enter valid positive wall dimensions (Length, Height, Thickness).</p>';
            return null;
        }
        if (isNaN(brickSizeLength) || isNaN(brickSizeWidth) || isNaN(brickSizeHeight) || brickSizeLength <= 0 || brickSizeWidth <= 0 || brickSizeHeight <= 0) {
            resultsDiv.innerHTML = '<p class="error-message">Please enter valid positive brick dimensions.</p>';
            return null;
        }
        if (isNaN(mortarJointThickness) || mortarJointThickness < 0) {
            resultsDiv.innerHTML = '<p class="error-message">Please enter a valid mortar joint thickness (0 or positive).</p>';
            return null;
        }
        if (wasteFactor < 0 || wasteFactor > 100) {
            resultsDiv.innerHTML = '<p class="error-message">Waste factor must be between 0 and 100.</p>';
            return null;
        }

        const mortarParts = mortarMixInput.split(':').map(part => parseFloat(part.trim()));
        if (mortarParts.length !== 2 || mortarParts.some(isNaN) || mortarParts.some(part => part <= 0)) {
            resultsDiv.innerHTML = '<p class="error-message">Please enter a valid mortar mix ratio (e.g., 1:4 Cement:Sand).</p>';
            return null;
        }
        const [cementMortarPart, sandMortarPart] = mortarParts;
        const sumOfMortarParts = cementMortarPart + sandMortarPart;

        const wallVolume = wallLength * wallHeight * wallThickness;

        const effectiveBrickLength = brickSizeLength + mortarJointThickness;
        const effectiveBrickHeight = brickSizeHeight + mortarJointThickness;
        const bricksPerSqMeter = 1 / (effectiveBrickLength * effectiveBrickHeight);

        const layersInThickness = Math.round(wallThickness / (brickSizeWidth + mortarJointThickness));
        if (layersInThickness === 0) layersInThickness = 1;

        const totalBricksWithoutWaste = bricksPerSqMeter * wallLength * wallHeight * layersInThickness;
        const actualBricksRequired = totalBricksWithoutWaste * (1 + wasteFactor / 100);

        const totalVolumeOfBricks = actualBricksRequired * brickSizeLength * brickSizeWidth * brickSizeHeight;
        const totalMortarVolumeWet = wallVolume - (totalVolumeOfBricks / (1 + wasteFactor / 100));
        const totalMortarVolumeWetWithWaste = totalMortarVolumeWet * (1 + wasteFactor / 100);
        const dryMortarVolume = totalMortarVolumeWetWithWaste * 1.33;

        const cementMortarVolume = (cementMortarPart / sumOfMortarParts) * dryMortarVolume;
        const sandMortarVolume = (sandMortarPart / sumOfMortarParts) * dryMortarVolume;
        const cementMortarBags = (cementMortarVolume * 1440) / 50;

        return {
            type: 'bricks',
            name: 'Brickwork Calculation',
            wallLength: wallLength,
            wallHeight: wallHeight,
            wallThickness: wallThickness,
            wasteFactor: wasteFactor,
            mortarMix: mortarMixInput,
            brickSizeLength: brickSizeLength,
            brickSizeWidth: brickSizeWidth,
            brickSizeHeight: brickSizeHeight,
            mortarJointThickness: mortarJointThickness,
            calculated: {
                totalBricks: Math.ceil(actualBricksRequired),
                totalMortarWetVolume: totalMortarVolumeWetWithWaste,
                cementMortarVolume: cementMortarVolume,
                sandMortarVolume: sandMortarVolume,
                cementMortarBags: Math.ceil(cementMortarBags)
            }
        };
    }

    function collectCurrentCalculationData() {
        const selectedMaterial = materialTypeSelect.value;
        let calculationData = null;

        if (selectedMaterial === 'concrete') {
            calculationData = calculateConcrete();
        } else if (selectedMaterial === 'bricks') {
            calculationData = calculateBricks();
        }

        if (calculationData) {
            if (currentEditingCalculationId) {
                calculationData._id = currentEditingCalculationId;
            } else {
                calculationData._id = 'temp_' + Date.now() + Math.random().toString(36).substring(2, 9);
            }
        }
        return calculationData;
    }

    function calculateAndAggregateResults(calculationsToProcess = []) {
        resultsDiv.innerHTML = '';

        let displayCalculations = calculationsToProcess;
        if (calculationsToProcess.length === 0) {
            const currentCalculation = collectCurrentCalculationData();
            if (currentCalculation) {
                displayCalculations = [currentCalculation];
            } else {
                resultsDiv.innerHTML = '<p class="error-message">No valid calculation to display. Please correct inputs.</p>';
                return;
            }
        }

        let totalCementBags = 0;
        let totalSandM3 = 0;
        let totalAggregateM3 = 0;
        let totalBricksNos = 0;
        let totalEstimatedCost = 0;

        let individualResultsHtml = '<h2>Individual Calculation Results</h2>';
        individualResultsHtml += '<div class="individual-calculations-list">';

        if (displayCalculations.length === 0) {
            individualResultsHtml += '<p>No calculations available to display.</p>';
        } else {
            displayCalculations.forEach((calc, index) => {
                individualResultsHtml += `<div class="calculation-detail">`;
                individualResultsHtml += `<h4>${calc.name || 'Untitled Calculation'} (${calc.type})</h4>`;
                individualResultsHtml += `<p>Waste: ${calc.wasteFactor || 0}%</p>`;

                if (calc.type === 'concrete' && calc.calculated) {
                    const c = calc.calculated;
                    individualResultsHtml += `<p><strong>Wet Concrete Volume:</strong> ${c.wetVolume.toFixed(2)} m³</p>`;
                    individualResultsHtml += `<p><strong>Cement:</strong> ${c.cementVolume.toFixed(2)} m³ (~ ${c.cementBags.toFixed(1)} bags)</p>`;
                    individualResultsHtml += `<p><strong>Sand:</strong> ${c.sandVolume.toFixed(2)} m³</p>`;
                    individualResultsHtml += `<p><strong>Aggregate:</strong> ${c.aggregateVolume.toFixed(2)} m³</p>`;

                    totalCementBags += c.cementBags;
                    totalSandM3 += c.sandVolume;
                    totalAggregateM3 += c.aggregateVolume;

                } else if (calc.type === 'bricks' && calc.calculated) {
                    const b = calc.calculated;
                    individualResultsHtml += `<p><strong>Total Bricks:</strong> ${b.totalBricks} Nos.</p>`;
                    individualResultsHtml += `<p><strong>Total Mortar (Wet):</strong> ${b.totalMortarWetVolume.toFixed(3)} m³</p>`;
                    individualResultsHtml += `<p><strong>Cement for Mortar:</strong> ${b.cementMortarVolume.toFixed(3)} m³ (~ ${b.cementMortarBags} bags)</p>`;
                    individualResultsHtml += `<p><strong>Sand for Mortar:</strong> ${b.sandMortarVolume.toFixed(3)} m³</p>`;

                    totalBricksNos += b.totalBricks;
                    totalCementBags += b.cementMortarBags;
                    totalSandM3 += b.sandMortarVolume;
                }
                individualResultsHtml += `</div>`;
            });
        }
        individualResultsHtml += `</div>`;

        totalEstimatedCost += totalCementBags * materialPrices.cement_bags;
        totalEstimatedCost += totalSandM3 * materialPrices.sand_m3;
        totalEstimatedCost += totalAggregateM3 * materialPrices.aggregate_m3;
        totalEstimatedCost += totalBricksNos * materialPrices.bricks_nos;


        let summaryHtml = `
            <h2>Project Material Summary & Cost Estimate</h2>
            <div class="summary-box">
                <p><strong>Total Cement:</strong> ${totalCementBags.toFixed(1)} bags</p>
                <p><strong>Total Sand:</strong> ${totalSandM3.toFixed(2)} m³</p>
                <p><strong>Total Aggregate:</strong> ${totalAggregateM3.toFixed(2)} m³</p>
                <p><strong>Total Bricks:</strong> ${Math.ceil(totalBricksNos)} Nos.</p>
                <h3>Estimated Total Cost: ₹ ${totalEstimatedCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                <p class="small-text"><em>(Based on current material prices. Always verify actual market rates.)</em></p>
            </div>
        `;

        resultsDiv.innerHTML = summaryHtml + individualResultsHtml;
    }


    function displaySaveMessage(message, isSuccess) {
        saveMessageDiv.textContent = message;
        saveMessageDiv.className = 'message-area';
        if (isSuccess) {
            saveMessageDiv.classList.add('success');
        } else {
            saveMessageDiv.classList.add('error');
        }
        setTimeout(() => {
            saveMessageDiv.textContent = '';
            saveMessageDiv.className = 'message-area';
        }, 5000);
    }

    async function saveProject() {
            saveMessageDiv.innerHTML = '';
            const projectName = projectNameInput.value.trim();
            if (!projectName) {
                displaySaveMessage('Please enter a project name before saving.', false);
                return;
            }

            currentProjectData.projectName = projectName;

            const dataToSend = { ...currentProjectData }; // Create a shallow copy
            dataToSend.calculations = dataToSend.calculations.map(calc => {
                const newCalc = { ...calc }; // Copy individual calculation
                // --- FIXED: Check for all types of client-side temporary IDs ---
                // MongoDB expects valid ObjectIds for _id. If we generated a temporary string _id,
                // we must delete it so MongoDB can generate a proper one.
                if (typeof newCalc._id === 'string') {
                    if (newCalc._id.startsWith('temp_') || newCalc._id.startsWith('plan_wall_') || newCalc._id.startsWith('plan_room_')) {
                        delete newCalc._id;
                    }
                    // Optional: If _id is a string but doesn't look like a valid ObjectId (e.g., 24 hex chars),
                    // it might also need to be deleted. But for now, checking prefixes is enough.
                }
                // --- END FIXED ---
                return newCalc;
            });

            let response;
            let method;
            let url;

            if (currentLoadedProjectName && currentLoadedProjectName === projectName) {
                method = 'PUT';
                url = `http://localhost:5000/api/projects/${encodeURIComponent(projectName)}`;
            } else {
                method = 'POST';
                url = 'http://localhost:5000/api/projects';
            }

            try {
                response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dataToSend) // Send the cleaned dataToSend object
                });

                const result = await response.json();

                if (response.ok) {
                    displaySaveMessage(`Project "${result.projectName}" ${method === 'POST' ? 'saved' : 'updated'} successfully!`, true);
                    projectNameInput.value = result.projectName;
                    currentLoadedProjectName = result.projectName;
                    currentProjectData = { ...result }; // Update currentProjectData with saved/updated data (includes actual _ids now)
                    displayProjectCalculations();
                    calculateAndAggregateResults(currentProjectData.calculations);
                    await populateProjectList();
                } else {
                    displaySaveMessage(`Error ${method === 'POST' ? 'saving' : 'updating'} project: ${result.message || 'Unknown error'}`, false);
                }
            } catch (error) {
                    console.error('Network or fetch error:', error);
                    displaySaveMessage(`Network error: Could not connect to server.`, false);
            }
    }


    function displayLoadMessage(message, isSuccess) {
        loadMessageDiv.textContent = message;
        loadMessageDiv.className = 'message-area';
        if (isSuccess) {
            loadMessageDiv.classList.add('success');
        } else {
            loadLoadMessage.classList.add('error'); // Fixed typo here
        }
        setTimeout(() => {
            loadMessageDiv.textContent = '';
            loadMessageDiv.className = 'message-area';
        }, 5000);
    }


    async function populateProjectList() {
        const prevSelectedProject = projectListSelect.value;
        projectListSelect.innerHTML = '<option value="">-- Select a Project --</option>';
        loadMessageDiv.innerHTML = '';
        try {
            const response = await fetch('http://localhost:5000/api/projects');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const projects = await response.json();

            if (projects.length === 0) {
                displayLoadMessage('No projects saved yet.', false);
                return;
            }

            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.projectName;
                option.textContent = project.projectName;
                projectListSelect.appendChild(option);
            });
            if (prevSelectedProject && projects.some(p => p.projectName === prevSelectedProject)) {
                projectListSelect.value = prevSelectedProject;
            }
            displayLoadMessage(`Loaded ${projects.length} project(s) into dropdown.`, true);
        } catch (error) {
            console.error('Error fetching project list:', error);
            displayLoadMessage('Error fetching projects. Is the backend running?', false);
        }
    }

    async function loadSelectedProject() {
        const selectedProjectName = projectListSelect.value;
        if (!selectedProjectName) {
            displayLoadMessage('Please select a project to load.', false);
            return;
        }
        loadMessageDiv.innerHTML = '';

        try {
            const response = await fetch(`http://localhost:5000/api/projects?name=${encodeURIComponent(selectedProjectName)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const project = await response.json();

            if (!project) {
                displayLoadMessage(`Project "${selectedProjectName}" not found.`, false);
                return;
            }

            clearCalculatorInputs();
            projectNameInput.value = project.projectName;
            currentLoadedProjectName = project.projectName;
            currentProjectData = { ...project };
            projectCalculationsSection.classList.remove('hidden');

            displayLoadMessage(`Project "${project.projectName}" loaded successfully.`, true);

            if (project.calculations && project.calculations.length > 0) {
                editCalculation(project.calculations[0]._id);
            } else {
                displayLoadMessage(`Project "${project.projectName}" has no calculations. Start by adding one.`, false);
                currentEditingCalculationId = null;
            }

            displayProjectCalculations();
            calculateAndAggregateResults(currentProjectData.calculations);

        } catch (error) {
            console.error('Error loading project:', error);
            displayLoadMessage('Error loading project. Is the backend running?', false);
            currentLoadedProjectName = null;
            currentProjectData = { calculations: [] };
            projectCalculationsSection.classList.add('hidden');
        }
    }

    async function editCalculation(id) {
        const calculationToEdit = currentProjectData.calculations.find(calc => calc._id === id);
        if (!calculationToEdit) {
            displayCalculationsListMessage('Calculation not found for editing.', false);
            return;
        }

        clearCalculatorInputs();
        currentEditingCalculationId = id;

        materialTypeSelect.value = calculationToEdit.type;
        showInputsForMaterial(calculationToEdit.type);

        if (calculationToEdit.type === 'concrete') {
            document.getElementById('length').value = calculationToEdit.length || '';
            document.getElementById('width').value = calculationToEdit.width || '';
            document.getElementById('height').value = calculationToEdit.height || '';
            document.getElementById('concreteMix').value = calculationToEdit.concreteMix || '1:2:4';
            document.getElementById('wasteFactor').value = calculationToEdit.wasteFactor || 5;
        } else if (calculationToEdit.type === 'bricks') {
            document.getElementById('brickWallLength').value = calculationToEdit.wallLength || '';
            document.getElementById('brickWallHeight').value = calculationToEdit.wallHeight || '';
            document.getElementById('brickWallThickness').value = calculationToEdit.wallThickness || '';
            document.getElementById('mortarMix').value = calculationToEdit.mortarMix || '1:4';
            document.getElementById('brickSizeLength').value = calculationToEdit.brickSizeLength || 0.190;
            document.getElementById('brickSizeWidth').value = calculationToEdit.brickSizeWidth || 0.090;
            document.getElementById('brickSizeHeight').value = calculationToEdit.brickSizeHeight || 0.090;
            document.getElementById('mortarJointThickness').value = calculationToEdit.mortarJointThickness || 0.010;
            document.getElementById('brickWasteFactor').value = calculationToEdit.wasteFactor || 5;
        }
        displayCalculationsListMessage(`Editing "${calculationToEdit.name || calculationToEdit.type}". Modify inputs, then click "Add Current to Project" to update it within the project.`, true);

        displayProjectCalculations();
    }

    async function deleteCalculation(id) {
        if (!confirm('Are you sure you want to delete this calculation? This action cannot be undone unless you cancel saving the project.')) {
            return;
        }
        const initialCount = currentProjectData.calculations.length;
        currentProjectData.calculations = currentProjectData.calculations.filter(calc => calc._id !== id);

        if (currentProjectData.calculations.length < initialCount) {
            displayCalculationsListMessage('Calculation deleted from project. Click "Save Current Project" to confirm changes in database.', true);
            displayProjectCalculations();

            if (currentEditingCalculationId === id) {
                clearCalculatorInputs();
            }
            calculateAndAggregateResults(currentProjectData.calculations);
        } else {
            displayCalculationsListMessage('Calculation not found for deletion.', false);
        }
    }


    function clearCalculatorInputs() {
        document.getElementById('length').value = '';
        document.getElementById('width').value = '';
        document.getElementById('height').value = '';
        document.getElementById('concreteMix').value = '1:2:4';
        document.getElementById('wasteFactor').value = 5;

        document.getElementById('brickWallLength').value = '';
        document.getElementById('brickWallHeight').value = '';
        document.getElementById('brickWallThickness').value = '';
        document.getElementById('mortarMix').value = '1:4';
        document.getElementById('brickSizeLength').value = 0.190;
        document.getElementById('brickSizeWidth').value = 0.090;
        document.getElementById('brickSizeHeight').value = 0.090;
        document.getElementById('mortarJointThickness').value = 0.010;
        document.getElementById('brickWasteFactor').value = 5;

        resultsDiv.innerHTML = '';
        currentEditingCalculationId = null;
        
        document.querySelectorAll('.calculation-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    calculateBtn.addEventListener('click', () => {
        const selectedMaterial = materialTypeSelect.value;
        let currentCalculation = null;

        if (selectedMaterial === 'concrete') {
            currentCalculation = calculateConcrete();
        } else if (selectedMaterial === 'bricks') {
            currentCalculation = calculateBricks();
        }

        if (currentCalculation) {
            calculateAndAggregateResults([currentCalculation]);
        } else {
            resultsDiv.innerHTML = '<p class="error-message">Please correct input errors to see calculation results.</p>';
        }
    });

    materialTypeSelect.addEventListener('change', (event) => {
        showInputsForMaterial(event.target.value);
    });

    saveProjectBtn.addEventListener('click', saveProject);

    loadProjectBtn.addEventListener('click', loadSelectedProject);

    refreshProjectsBtn.addEventListener('click', populateProjectList);

    deleteProjectBtn.addEventListener('click', async () => {
        const selectedProjectToDelete = projectListSelect.value;
        if (!selectedProjectToDelete) {
            displayLoadMessage('Please select a project to delete from the list.', false);
            return;
        }

        if (!confirm(`Are you sure you want to delete the project "${selectedProjectToDelete}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/projects/${encodeURIComponent(selectedProjectToDelete)}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                displayLoadMessage(`Project "${result.deletedProjectName}" deleted successfully.`, true);
                if (currentLoadedProjectName === selectedProjectToDelete) {
                    clearCalculatorInputs();
                    projectNameInput.value = '';
                    currentLoadedProjectName = null;
                    currentProjectData = { calculations: [] };
                    projectCalculationsSection.classList.add('hidden');
                }
                
                projectListSelect.value = '';
                await populateProjectList();
                
            } else {
                displayLoadMessage(`Error deleting project: ${result.message || 'Unknown error'}`, false);
            }
        } catch (error) {
            console.error('Network or fetch error during project deletion:', error);
            displayLoadMessage(`Network error: Could not connect to server for deletion.`, false);
        }
    });

    addCalculationToProjectBtn.addEventListener('click', () => {
        if (!currentProjectData.projectName || currentProjectData.projectName.trim() === '') {
            displayCalculationsListMessage('Please enter a project name in the "Save Project" section first.', false);
            return;
        }

        const newCalc = collectCurrentCalculationData();
        if (newCalc) {
            if (currentEditingCalculationId) {
                const index = currentProjectData.calculations.findIndex(calc => calc._id === currentEditingCalculationId);
                if (index !== -1) {
                    currentProjectData.calculations[index] = newCalc;
                    displayCalculationsListMessage('Calculation updated in project. Click "Save Project" to save changes to database.', true);
                } else {
                    currentProjectData.calculations.push(newCalc);
                    displayCalculationsListMessage('Calculation added as new (ID not found for edit).', true);
                }
            } else {
                currentProjectData.calculations.push(newCalc);
                displayCalculationsListMessage(`New calculation "${newCalc.name || newCalc.type}" added to project. Click "Save Project" to save changes to database.`, true);
            }
            clearCalculatorInputs();
            displayProjectCalculations();
            calculateAndAggregateResults(currentProjectData.calculations);
        } else {
            displayCalculationsListMessage('Cannot add: invalid calculation inputs. Please correct.', false);
        }
    });

    clearCurrentFormBtn.addEventListener('click', () => {
        clearCalculatorInputs();
        showInputsForMaterial(materialTypeSelect.value);
        displayCalculationsListMessage('Form cleared. Ready for a new calculation.', true);
    });

    startNewProjectBtn.addEventListener('click', () => {
        clearCalculatorInputs();
        projectNameInput.value = '';
        currentLoadedProjectName = null;
        currentProjectData = { calculations: [] };
        projectCalculationsSection.classList.add('hidden');
        showInputsForMaterial(materialTypeSelect.value);
        displaySaveMessage('All project data cleared. Ready to create a brand new project.', true);
        displayProjectCalculations();
    });

    projectNameInput.addEventListener('input', () => {
        const inputName = projectNameInput.value.trim();

        if (inputName !== '') {
            projectCalculationsSection.classList.remove('hidden');

            if (!currentLoadedProjectName && (!currentProjectData.projectName || currentProjectData.projectName.trim() === '')) {
                currentProjectData = { projectName: inputName, calculations: [] };
                displayCalculationsListMessage('Project name entered. Add your first calculation!', true);
            } else if (currentLoadedProjectName && currentLoadedProjectName !== inputName) {
                displayCalculationsListMessage('Note: Changing project name will save as a NEW project unless you rename back.', false);
                currentProjectData.projectName = inputName;
            } else if (currentLoadedProjectName && currentLoadedProjectName === inputName) {
                 displayCalculationsListMessage('', false);
                 currentProjectData.projectName = inputName;
            } else if (!currentLoadedProjectName && currentProjectData.projectName !== inputName) {
                currentProjectData.projectName = inputName;
                displayCalculationsListMessage('Project name changed for new project.', true);
            }

        } else {
            if (!currentLoadedProjectName) {
                projectCalculationsSection.classList.add('hidden');
                currentProjectData = { calculations: [] };
            }
            displayCalculationsListMessage('Enter a project name.', false);
        }
        displayProjectCalculations();
    });

    // --- NEW: Event Listener for Generate Report Button ---
    generateReportBtn.addEventListener('click', async () => {
        if (!currentProjectData.projectName || currentProjectData.calculations.length === 0) {
            displaySaveMessage('Load or create a project with calculations first to generate a report.', false);
            return;
        }

        // Prepare data to send to backend for report generation
        // We'll send the entire currentProjectData
        const reportData = {
            projectName: currentProjectData.projectName,
            description: currentProjectData.description,
            calculations: currentProjectData.calculations
        };

        try {
            // We'll send a POST request to a new backend endpoint
            // The backend will generate the file and send it back
            const response = await fetch('http://localhost:5000/api/reports/csv', { // Example: CSV report
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

            if (response.ok) {
                // If the backend sends a file, this will trigger the download
                // response.blob() handles binary data like files
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${currentProjectData.projectName.replace(/[^a-z0-9]/gi, '_')}_Material_Report.csv`; // Sanitize filename
                document.body.appendChild(a);
                a.click(); // Programmatically click the link to trigger download
                window.URL.revokeObjectURL(url); // Clean up the URL object
                displaySaveMessage('Report generated and download initiated!', true);
            } else {
                const errorResult = await response.json(); // Backend might send error JSON
                displaySaveMessage(`Error generating report: ${errorResult.message || 'Unknown error'}`, false);
            }
        } catch (error) {
            console.error('Network or fetch error during report generation:', error);
            displaySaveMessage('Network error: Could not connect to server for report generation.', false);
        }
    });

    // --- NEW: Event Listener for Generate PDF Report Button ---
    generatePDFReportBtn.addEventListener('click', async () => {
        if (!currentProjectData.projectName || currentProjectData.calculations.length === 0) {
            displaySaveMessage('Load or create a project with calculations first to generate a PDF report.', false);
            return;
        }

        const reportData = {
            projectName: currentProjectData.projectName,
            description: currentProjectData.description,
            calculations: currentProjectData.calculations
        };

        try {
            const response = await fetch('http://localhost:5000/api/reports/pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

            if (response.ok) {
                const blob = await response.blob(); // PDF is a blob
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${currentProjectData.projectName.replace(/[^a-z0-9]/gi, '_')}_Material_Report.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                displaySaveMessage('PDF Report generated and download initiated!', true);
            } else {
                const errorResult = await response.json();
                displaySaveMessage(`Error generating PDF report: ${errorResult.message || 'Unknown error'}`, false);
            }
        } catch (error) {
            console.error('Network or fetch error during PDF report generation:', error);
            displaySaveMessage('Network error: Could not connect to server for PDF report generation.', false);
        }
    });

    // --- NEW: Logic for handling exported plan elements from sessionStorage ---
    function loadExportedPlanElements() {
        const exportedPlanElementsJSON = sessionStorage.getItem('exportedPlanElements');
        if (exportedPlanElementsJSON) {
            try {
                const elements = JSON.parse(exportedPlanElementsJSON);
                sessionStorage.removeItem('exportedPlanElements'); // Clear it immediately

                if (elements.length > 0) {
                    clearCalculatorInputs(); // Clear current form state
                    projectNameInput.value = 'New Plan Project - ' + Date.now(); // Suggest a project name
                    currentLoadedProjectName = null; // Ensure it's treated as a new project
                    currentProjectData = { projectName: projectNameInput.value, calculations: [] };
                    
                    const newCalculations = [];
                    let plotAreaCalculation = null;

                    elements.forEach(element => {
                        if (element.type === 'external_wall' || element.type === 'internal_wall') {
                            // Convert wall element to a Bricks calculation
                            // Assumptions: All walls are brickwork, standard mortar mix, standard brick size
                            // You can make these configurable later.
                            const wallCalculation = {
                                _id: 'plan_wall_' + element._id, // Retain ID from plan, prefix to distinguish
                                type: 'bricks',
                                name: `${element.name || element.type} - ${element.length.toFixed(2)}m`,
                                wallLength: element.length,
                                wallHeight: 3.0, // Assuming a standard wall height for all walls (e.g., 3 meters)
                                wallThickness: element.thickness,
                                mortarMix: '1:4',
                                brickSizeLength: 0.190,
                                brickSizeWidth: 0.090,
                                brickSizeHeight: 0.090,
                                mortarJointThickness: 0.010,
                                wasteFactor: 5 // Default waste factor
                            };
                            // Manually calculate quantities for the exported wall to store 'calculated' data
                            // This mimics what calculateBricks() would do
                            const mockBrickCalc = calculateBricksForExport(wallCalculation);
                            if(mockBrickCalc) {
                                wallCalculation.calculated = mockBrickCalc.calculated;
                                newCalculations.push(wallCalculation);
                            }
                        } else if (element.type === 'room') {
                            // Convert room element to a Flooring/Painting calculation (example)
                            // This is a simplified approach, you'd need more details for concrete/plaster
                            const roomCalculation = {
                                _id: 'plan_room_' + element._id,
                                type: 'concrete', // Can be refined to 'flooring' or 'paint'
                                name: `${element.name || 'Room'} - Flooring`,
                                length: element.width,
                                width: element.height,
                                height: 0.1, // Assuming a nominal thickness for flooring concrete
                                concreteMix: '1:2:4',
                                wasteFactor: 5,
                            };
                            const mockConcreteCalc = calculateConcreteForExport(roomCalculation);
                            if (mockConcreteCalc) {
                                roomCalculation.calculated = mockConcreteCalc.calculated;
                                newCalculations.push(roomCalculation);
                            }
                        } else if (element.type === 'plot_area') {
                            plotAreaCalculation = element; // Keep plot area data for reference
                            // No direct QSC calculation from plot area usually, but useful info.
                        }
                    });

                    currentProjectData.calculations = newCalculations;
                    
                    projectCalculationsSection.classList.remove('hidden');
                    displayProjectCalculations();
                    calculateAndAggregateResults(currentProjectData.calculations);
                    displaySaveMessage('Plan imported successfully! Review and Save Project.', true);
                    
                    // You might want to display the overall plot area info somewhere
                    if (plotAreaCalculation) {
                        // For now, just log it. Could add a dedicated display area.
                        console.log('Imported Plot Area:', plotAreaCalculation);
                    }

                } else {
                    displaySaveMessage('No elements found in exported plan data.', false);
                }
            } catch (error) {
                console.error('Error parsing exported plan elements:', error);
                displaySaveMessage('Error importing plan data.', false);
            }
        }
    }

    // --- Helper for export: A "mock" calculateBricks/Concrete that doesn't modify UI ---
    // These functions perform the calculation logic similar to the main calc functions
    // but without touching the DOM directly, so they can be reused for imported data.

    function calculateBricksForExport(data) {
        // Use data from the imported element
        const wallLength = data.wallLength;
        const wallHeight = data.wallHeight;
        const wallThickness = data.wallThickness;
        const mortarMixInput = data.mortarMix;
        const brickSizeLength = data.brickSizeLength;
        const brickSizeWidth = data.brickSizeWidth;
        const brickSizeHeight = data.brickSizeHeight;
        const mortarJointThickness = data.mortarJointThickness;
        const wasteFactor = data.wasteFactor;

        const mortarParts = mortarMixInput.split(':').map(part => parseFloat(part.trim()));
        const [cementMortarPart, sandMortarPart] = mortarParts;
        const sumOfMortarParts = cementMortarPart + sandMortarPart;

        const wallVolume = wallLength * wallHeight * wallThickness;

        const effectiveBrickLength = brickSizeLength + mortarJointThickness;
        const effectiveBrickHeight = brickSizeHeight + mortarJointThickness;
        const bricksPerSqMeter = 1 / (effectiveBrickLength * effectiveBrickHeight);

        const layersInThickness = Math.round(wallThickness / (brickSizeWidth + mortarJointThickness));
        if (layersInThickness === 0) layersInThickness = 1;

        const totalBricksWithoutWaste = bricksPerSqMeter * wallLength * wallHeight * layersInThickness;
        const actualBricksRequired = totalBricksWithoutWaste * (1 + wasteFactor / 100);

        const totalVolumeOfBricks = actualBricksRequired * brickSizeLength * brickSizeWidth * brickSizeHeight;
        const totalMortarVolumeWet = wallVolume - (totalVolumeOfBricks / (1 + wasteFactor / 100));
        const totalMortarVolumeWetWithWaste = totalMortarVolumeWet * (1 + wasteFactor / 100);
        const dryMortarVolume = totalMortarVolumeWetWithWaste * 1.33;

        const cementMortarVolume = (cementMortarPart / sumOfMortarParts) * dryMortarVolume;
        const sandMortarVolume = (sandMortarPart / sumOfMortarParts) * dryMortarVolume;
        const cementMortarBags = (cementMortarVolume * 1440) / 50;

        return {
            calculated: {
                totalBricks: Math.ceil(actualBricksRequired),
                totalMortarWetVolume: totalMortarVolumeWetWithWaste,
                cementMortarVolume: cementMortarVolume,
                sandMortarVolume: sandMortarVolume,
                cementMortarBags: Math.ceil(cementMortarBags)
            }
        };
    }

    function calculateConcreteForExport(data) {
        const length = data.length;
        const width = data.width;
        const height = data.height;
        const concreteMixInput = data.concreteMix;
        const wasteFactor = data.wasteFactor;

        const mixParts = concreteMixInput.split(':').map(part => parseFloat(part.trim()));
        const [cementPart, sandPart, aggregatePart] = mixParts;
        const sumOfParts = cementPart + sandPart + aggregatePart;

        const wetVolume = length * width * height;
        const dryVolume = wetVolume * 1.54;

        const cementVolume = (cementPart / sumOfParts) * dryVolume;
        const sandVolume = (sandPart / sumOfParts) * dryVolume;
        const aggregateVolume = (aggregatePart / sumOfParts) * dryVolume;

        const cementInKg = cementVolume * 1440;
        let cementBagsInitial = cementInKg / 50;

        const actualWetVolume = wetVolume * (1 + wasteFactor / 100);
        const actualDryVolume = dryVolume * (1 + wasteFactor / 100);
        const actualCementVolume = cementVolume * (1 + wasteFactor / 100);
        const actualSandVolume = sandVolume * (1 + wasteFactor / 100);
        const actualAggregateVolume = aggregateVolume * (1 + wasteFactor / 100);
        const actualCementBags = cementBagsInitial * (1 + wasteFactor / 100);

        return {
            calculated: {
                wetVolume: actualWetVolume,
                dryVolume: actualDryVolume,
                cementVolume: actualCementVolume,
                sandVolume: actualSandVolume,
                aggregateVolume: actualAggregateVolume,
                cementBags: actualCementBags,
            }
        };
    }


    // --- INITIAL LOAD ---
    populateProjectList();
    loadExportedPlanElements(); // Call this on page load for QSC page
});