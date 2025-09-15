// ComfyUI Mini - Static Version
// Main application logic

// ===============================
// Configuration Management
// ===============================
class ConfigManager {
    constructor() {
        this.defaultConfig = {
            comfyuiUrl: 'http://127.0.0.1:8188',
            comfyuiWsUrl: 'ws://127.0.0.1:8188',
            theme: 'dark'
        };
        this.loadConfig();
    }

    loadConfig() {
        const saved = localStorage.getItem('comfyui-mini-config');
        this.config = saved ? {...this.defaultConfig, ...JSON.parse(saved)} : {...this.defaultConfig};
        this.applyTheme();
        return this.config;
    }

    saveConfig(newConfig) {
        this.config = {...this.config, ...newConfig};
        localStorage.setItem('comfyui-mini-config', JSON.stringify(this.config));
        this.applyTheme();
    }

    applyTheme() {
        const themeLink = document.getElementById('theme-css');
        if (themeLink) {
            themeLink.href = `assets/css/theme/${this.config.theme}.css`;
        }
    }

    get(key) {
        return this.config[key];
    }
}

// ===============================
// Workflow Management
// ===============================
class WorkflowManager {
    constructor() {
        this.workflows = this.loadWorkflows();
        this.currentWorkflow = null;
    }

    loadWorkflows() {
        const saved = localStorage.getItem('comfyui-mini-workflows');
        return saved ? JSON.parse(saved) : [];
    }

    saveWorkflows() {
        localStorage.setItem('comfyui-mini-workflows', JSON.stringify(this.workflows));
    }

    addWorkflow(workflow) {
        const id = this.generateWorkflowId(workflow.title || 'Untitled');
        const workflowWithId = {
            id,
            title: workflow.title || 'Untitled Workflow',
            description: workflow.description || 'No description',
            workflow,
            createdAt: Date.now()
        };
        this.workflows.push(workflowWithId);
        this.saveWorkflows();
        return workflowWithId;
    }

    removeWorkflow(id) {
        this.workflows = this.workflows.filter(w => w.id !== id);
        this.saveWorkflows();
    }

    getWorkflow(id) {
        return this.workflows.find(w => w.id === id);
    }

    generateWorkflowId(title) {
        const base = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        let id = base;
        let counter = 1;
        while (this.workflows.find(w => w.id === id)) {
            id = `${base}-${counter}`;
            counter++;
        }
        return id;
    }

    validateWorkflow(workflow) {
        if (!workflow || typeof workflow !== 'object') {
            throw new Error('Invalid workflow: must be a non-null object');
        }
        if (Object.keys(workflow).length === 0) {
            throw new Error('Invalid workflow: must not be empty');
        }
        if ('version' in workflow) {
            throw new Error('Invalid workflow: must be exported in API format (remove version field)');
        }
        // Basic validation - could be more comprehensive
        for (const [nodeId, node] of Object.entries(workflow)) {
            if (!node.class_type) {
                throw new Error(`Node ${nodeId} missing class_type`);
            }
        }
    }
}

// ===============================
// ComfyUI API Client
// ===============================
class ComfyUIClient {
    constructor(config) {
        this.config = config;
        this.clientId = this.generateClientId();
    }

    generateClientId() {
        return 'static-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.config.get('comfyuiUrl')}/system_stats`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async queuePrompt(workflow) {
        const response = await fetch(`${this.config.get('comfyuiUrl')}/prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: workflow,
                client_id: this.clientId
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to queue prompt: ${response.statusText}`);
        }

        return await response.json();
    }

    async getHistory(promptId) {
        const response = await fetch(`${this.config.get('comfyuiUrl')}/history/${promptId}`);
        if (!response.ok) {
            throw new Error(`Failed to get history: ${response.statusText}`);
        }
        return await response.json();
    }

    async getImage(filename, subfolder = '', type = 'output') {
        const params = new URLSearchParams({ filename, subfolder, type });
        const response = await fetch(`${this.config.get('comfyuiUrl')}/view?${params}`);
        if (!response.ok) {
            throw new Error(`Failed to get image: ${response.statusText}`);
        }
        return response.blob();
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${this.config.get('comfyuiUrl')}/upload/image`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
        }

        return await response.json();
    }

    async interrupt() {
        const response = await fetch(`${this.config.get('comfyuiUrl')}/interrupt`, { method: 'POST' });
        return response.ok;
    }

    createWebSocket() {
        return new WebSocket(`${this.config.get('comfyuiWsUrl')}/ws?clientId=${this.clientId}`);
    }
}

// ===============================
// UI Management
// ===============================
class UIManager {
    constructor(configManager, workflowManager, comfyClient) {
        this.config = configManager;
        this.workflows = workflowManager;
        this.comfyClient = comfyClient;
        this.currentView = 'home';
        this.ws = null;
        this.isGenerating = false;

        this.init();
    }

    init() {
        this.initSidebar();
        this.initEventListeners();
        this.loadHomeView();
        this.updateConfigInputs();
    }

    initSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        overlay?.addEventListener('click', () => this.closeSidebar());
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
            overlay.classList.remove('hidden');
            document.body.classList.add('locked');
        } else {
            this.closeSidebar();
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        sidebar.classList.add('hidden');
        overlay.classList.add('hidden');
        document.body.classList.remove('locked');
    }

    initEventListeners() {
        // Global event listeners
        document.getElementById('run-workflow')?.addEventListener('click', () => this.runWorkflow());
        document.getElementById('cancel-run')?.addEventListener('click', () => this.cancelRun());
        document.getElementById('workflow-file')?.addEventListener('change', (e) => this.handleWorkflowFileSelect(e));
        document.getElementById('theme-selector')?.addEventListener('change', (e) => this.changeTheme(e.target.value));
        document.getElementById('previous-outputs-toggler')?.addEventListener('click', () => this.togglePreviousOutputs());
    }

    showView(viewId) {
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
        document.querySelectorAll('.sidebar-list-item').forEach(item => item.classList.remove('active'));

        document.getElementById(`${viewId}-view`)?.classList.remove('hidden');
        document.getElementById(`${viewId}-link`)?.classList.add('active');

        this.currentView = viewId;
        this.closeSidebar();
    }

    loadHomeView() {
        this.showView('home');
        this.renderWorkflowGrid();
        this.updateWorkflowsList();
    }

    renderWorkflowGrid() {
        const grid = document.getElementById('workflow-grid');
        if (!grid) return;

        if (this.workflows.workflows.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No workflows imported yet</h3>
                    <p>Import a ComfyUI workflow to get started</p>
                    <button onclick="app.showImportView()">Import Workflow</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.workflows.workflows.map(workflow => `
            <div class="card-wrapper" onclick="app.loadWorkflow('${workflow.id}')">
                <div class="card">
                    <div class="card-info">
                        <span class="card-title">${workflow.title}</span>
                        <span class="card-description">${workflow.description}</span>
                    </div>
                    <div class="card-icons">
                        <div class="card-icon-container type-icon">
                            <span class="card-icon icon server"></span>
                        </div>
                        <div class="card-icon-container settings-icon">
                            <span class="card-icon icon settings" onclick="event.stopPropagation(); app.showWorkflowMenu('${workflow.id}')"></span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateWorkflowsList() {
        const workflowList = document.getElementById('workflow-list');
        if (!workflowList) return;

        if (this.workflows.workflows.length === 0) {
            workflowList.innerHTML = '<span>No workflows available</span>';
            return;
        }

        workflowList.innerHTML = this.workflows.workflows.map(workflow => `
            <a href="#" onclick="app.loadWorkflow('${workflow.id}')" class="sidebar-list-item">
                <span class="icon server"></span>
                <span class="sidebar-list-item-text">${workflow.title}</span>
            </a>
        `).join('');
    }

    loadWorkflow(workflowId) {
        const workflow = this.workflows.getWorkflow(workflowId);
        if (!workflow) {
            this.showPopup('Error', 'Workflow not found');
            return;
        }

        this.workflows.currentWorkflow = workflow;
        document.getElementById('workflow-title').textContent = workflow.title;
        this.showView('workflow');
        this.renderWorkflowInputs(workflow.workflow);
    }

    renderWorkflowInputs(workflow) {
        const container = document.getElementById('inputs-container');
        if (!container) return;

        // For simplicity, we'll create basic inputs for common node types
        // In a full implementation, you'd want to fetch ComfyUI's object info
        const inputsHtml = this.generateInputsFromWorkflow(workflow);
        container.innerHTML = inputsHtml;
    }

    generateInputsFromWorkflow(workflow) {
        let inputsHtml = '';

        // Look for common input nodes and generate UI
        for (const [nodeId, node] of Object.entries(workflow)) {
            if (this.shouldCreateInputForNode(node)) {
                for (const [inputName, inputValue] of Object.entries(node.inputs)) {
                    if (this.shouldCreateInputForField(inputName, inputValue)) {
                        inputsHtml += this.createInputField(nodeId, inputName, inputValue, node.class_type);
                    }
                }
            }
        }

        return inputsHtml || '<p>No editable inputs found in this workflow.</p>';
    }

    shouldCreateInputForNode(node) {
        // Create inputs for common node types that users typically want to modify
        const editableNodeTypes = [
            'KSampler', 'KSamplerAdvanced',
            'CLIPTextEncode', 'CLIPTextEncodeSDXL',
            'EmptyLatentImage',
            'CheckpointLoaderSimple',
            'LoraLoader'
        ];
        return editableNodeTypes.includes(node.class_type);
    }

    shouldCreateInputForField(inputName, inputValue) {
        // Skip array inputs and focus on user-editable fields
        if (Array.isArray(inputValue)) return false;

        const editableFields = ['text', 'seed', 'steps', 'cfg', 'width', 'height', 'denoise'];
        return editableFields.includes(inputName) || typeof inputValue === 'string' || typeof inputValue === 'number';
    }

    createInputField(nodeId, inputName, inputValue, nodeType) {
        const inputId = `input-${nodeId}-${inputName}`;
        const displayName = this.formatInputName(inputName);

        let inputElement = '';
        if (typeof inputValue === 'number') {
            const step = inputName === 'seed' ? '1' : (inputValue % 1 === 0 ? '1' : '0.1');
            inputElement = `<input type="number" id="${inputId}" class="workflow-input" value="${inputValue}" step="${step}">`;
        } else if (inputName === 'text' || typeof inputValue === 'string') {
            if (inputName === 'text') {
                inputElement = `<textarea id="${inputId}" class="workflow-input" rows="3">${inputValue}</textarea>`;
            } else {
                inputElement = `<input type="text" id="${inputId}" class="workflow-input" value="${inputValue}">`;
            }
        }

        return `
            <div class="workflow-input-container">
                <label for="${inputId}">${displayName} (${nodeType})</label>
                <div class="inner-input-wrapper">
                    ${inputElement}
                </div>
            </div>
        `;
    }

    formatInputName(inputName) {
        return inputName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async runWorkflow() {
        if (this.isGenerating || !this.workflows.currentWorkflow) return;

        try {
            this.isGenerating = true;
            this.updateRunButton(false);
            this.resetProgressBars();

            // Collect input values
            const inputValues = this.collectInputValues();
            const filledWorkflow = this.fillWorkflowWithInputs(this.workflows.currentWorkflow.workflow, inputValues);

            // Queue the prompt
            const response = await this.comfyClient.queuePrompt(filledWorkflow);
            const promptId = response.prompt_id;

            // Initialize WebSocket for progress updates
            this.initWebSocket(promptId);

        } catch (error) {
            this.showPopup('Error', `Failed to run workflow: ${error.message}`);
            this.isGenerating = false;
            this.updateRunButton(true);
        }
    }

    collectInputValues() {
        const inputs = {};
        document.querySelectorAll('.workflow-input').forEach(input => {
            const [, nodeId, inputName] = input.id.split('-');
            if (!inputs[nodeId]) inputs[nodeId] = {};
            inputs[nodeId][inputName] = input.type === 'number' ? parseFloat(input.value) : input.value;
        });
        return inputs;
    }

    fillWorkflowWithInputs(workflow, inputValues) {
        const filledWorkflow = JSON.parse(JSON.stringify(workflow));

        for (const [nodeId, nodeInputs] of Object.entries(inputValues)) {
            if (filledWorkflow[nodeId]) {
                for (const [inputName, inputValue] of Object.entries(nodeInputs)) {
                    if (filledWorkflow[nodeId].inputs[inputName] !== undefined) {
                        filledWorkflow[nodeId].inputs[inputName] = inputValue;
                    }
                }
            }
        }

        return filledWorkflow;
    }

    initWebSocket(promptId) {
        this.ws = this.comfyClient.createWebSocket();

        this.ws.onopen = () => {
            console.log('Connected to ComfyUI WebSocket');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data, promptId);
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            this.isGenerating = false;
            this.updateRunButton(true);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showPopup('Error', 'WebSocket connection error');
            this.isGenerating = false;
            this.updateRunButton(true);
        };
    }

    handleWebSocketMessage(data, promptId) {
        if (data.type === 'status' && data.data.sid === promptId) {
            // Handle status updates
        } else if (data.type === 'progress') {
            this.updateProgressBar(data.data.value, data.data.max);
        } else if (data.type === 'executed' && data.data.prompt_id === promptId) {
            this.handleWorkflowComplete(data.data.prompt_id);
        }
    }

    async handleWorkflowComplete(promptId) {
        try {
            const history = await this.comfyClient.getHistory(promptId);
            const outputs = history[promptId]?.outputs;

            if (outputs) {
                await this.displayOutputImages(outputs);
            }

            this.setProgressBar(100, 100);
        } catch (error) {
            this.showPopup('Error', `Failed to get results: ${error.message}`);
        } finally {
            this.isGenerating = false;
            this.updateRunButton(true);
            this.ws?.close();
        }
    }

    async displayOutputImages(outputs) {
        const container = document.getElementById('output-images-container');
        if (!container) return;

        let imagesHtml = '';

        for (const [nodeId, nodeOutputs] of Object.entries(outputs)) {
            if (nodeOutputs.images) {
                for (const image of nodeOutputs.images) {
                    try {
                        const imageBlob = await this.comfyClient.getImage(image.filename, image.subfolder, image.type);
                        const imageUrl = URL.createObjectURL(imageBlob);
                        imagesHtml += `<a href="${imageUrl}" target="_blank"><img src="${imageUrl}" class="output-image"></a>`;
                    } catch (error) {
                        console.error('Failed to load image:', error);
                    }
                }
            }
        }

        container.innerHTML = imagesHtml || '<p>No images generated</p>';
    }

    updateRunButton(enabled) {
        const button = document.getElementById('run-workflow');
        const cancelButton = document.getElementById('cancel-run');

        if (button) {
            button.disabled = !enabled;
            button.textContent = enabled ? 'Run workflow' : 'Generating...';
        }

        if (cancelButton) {
            cancelButton.classList.toggle('disabled', enabled);
        }
    }

    resetProgressBars() {
        this.setProgressBar(0, 100);
    }

    updateProgressBar(current, max) {
        const percentage = Math.round((current / max) * 100);
        this.setProgressBar(percentage, 100);
    }

    setProgressBar(current, max) {
        const percentage = Math.round((current / max) * 100);

        const currentBar = document.getElementById('current-progress-bar');
        const currentText = document.getElementById('current-progress-text');
        const totalBar = document.getElementById('total-progress-bar');
        const totalText = document.getElementById('total-progress-text');

        if (currentBar && currentText) {
            currentBar.style.width = `${percentage}%`;
            currentText.textContent = `${percentage}%`;
        }

        if (totalBar && totalText) {
            totalBar.style.width = `${percentage}%`;
            totalText.textContent = `${percentage}%`;
        }
    }

    async cancelRun() {
        if (!this.isGenerating) return;

        try {
            await this.comfyClient.interrupt();
            this.ws?.close();
            this.isGenerating = false;
            this.updateRunButton(true);
        } catch (error) {
            this.showPopup('Error', `Failed to cancel: ${error.message}`);
        }
    }

    handleWorkflowFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workflow = JSON.parse(e.target.result);
                this.workflows.validateWorkflow(workflow);

                // Generate metadata if not present
                if (!workflow._comfyuimini_meta) {
                    workflow._comfyuimini_meta = this.generateWorkflowMetadata(workflow);
                }

                this.workflows.addWorkflow(workflow);
                this.loadHomeView();
                this.showPopup('Success', 'Workflow imported successfully!');
            } catch (error) {
                this.showPopup('Error', `Failed to import workflow: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }

    generateWorkflowMetadata(workflow) {
        return {
            title: 'Imported Workflow',
            description: 'Imported from JSON file',
            format_version: '1.0',
            input_options: []
        };
    }

    updateConfigInputs() {
        const urlInput = document.getElementById('comfyui-url');
        const settingsUrlInput = document.getElementById('settings-comfyui-url');
        const settingsWsInput = document.getElementById('settings-comfyui-ws');
        const themeSelector = document.getElementById('theme-selector');

        if (urlInput) urlInput.value = this.config.get('comfyuiUrl');
        if (settingsUrlInput) settingsUrlInput.value = this.config.get('comfyuiUrl');
        if (settingsWsInput) settingsWsInput.value = this.config.get('comfyuiWsUrl');
        if (themeSelector) themeSelector.value = this.config.get('theme');
    }

    changeTheme(theme) {
        this.config.saveConfig({ theme });
    }

    togglePreviousOutputs() {
        const list = document.getElementById('previous-outputs-list');
        if (list) {
            list.classList.toggle('hidden');
        }
    }

    showPopup(title, message) {
        const popup = document.getElementById('popup-container');
        const titleEl = document.getElementById('popup-title');
        const messageEl = document.getElementById('popup-message');

        if (popup && titleEl && messageEl) {
            titleEl.textContent = title;
            messageEl.textContent = message;
            popup.classList.remove('hidden');
            document.body.classList.add('locked');
        }
    }

    closePopup() {
        const popup = document.getElementById('popup-container');
        if (popup) {
            popup.classList.add('hidden');
            document.body.classList.remove('locked');
        }
    }

    // View navigation methods
    showHomeView() { this.loadHomeView(); }
    showImportView() { this.showView('import'); }
    showSettingsView() { this.showView('settings'); }
}

// ===============================
// Global Functions (for onclick handlers)
// ===============================
let app; // Global app instance

function showHomeView() { app.showHomeView(); }
function showImportView() { app.showImportView(); }
function showSettingsView() { app.showSettingsView(); }
function closePopup() { app.closePopup(); }

function saveConfig() {
    const url = document.getElementById('comfyui-url')?.value;
    if (url) {
        app.config.saveConfig({
            comfyuiUrl: url,
            comfyuiWsUrl: url.replace(/^http/, 'ws')
        });
        app.showPopup('Success', 'Configuration saved!');
    }
}

async function testConnection() {
    const isConnected = await app.comfyClient.testConnection();
    app.showPopup(
        isConnected ? 'Success' : 'Error',
        isConnected ? 'Connected to ComfyUI!' : 'Failed to connect to ComfyUI'
    );
}

function importWorkflow() {
    const fileInput = document.getElementById('workflow-file');
    fileInput?.click();
}

function saveSettings() {
    const url = document.getElementById('settings-comfyui-url')?.value;
    const wsUrl = document.getElementById('settings-comfyui-ws')?.value;

    if (url && wsUrl) {
        app.config.saveConfig({
            comfyuiUrl: url,
            comfyuiWsUrl: wsUrl
        });
        app.showPopup('Success', 'Settings saved!');
    }
}

function exportData() {
    const data = {
        config: app.config.config,
        workflows: app.workflows.workflows
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comfyui-mini-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.config) app.config.saveConfig(data.config);
                if (data.workflows) {
                    app.workflows.workflows = data.workflows;
                    app.workflows.saveWorkflows();
                }
                app.loadHomeView();
                app.showPopup('Success', 'Data imported successfully!');
            } catch (error) {
                app.showPopup('Error', 'Failed to import data: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.clear();
        location.reload();
    }
}

// ===============================
// App Initialization
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    const configManager = new ConfigManager();
    const workflowManager = new WorkflowManager();
    const comfyClient = new ComfyUIClient(configManager);

    app = new UIManager(configManager, workflowManager, comfyClient);

    console.log('ComfyUI Mini Static initialized');
});