// Constants and Configuration
const CONFIG = {
    CAFFEINE: {
        HALF_LIFE: 5,
        MIN_LIMIT: 1,
        MAX_LIMIT: 1000,
        NEGLIGIBLE: 1,
        DEFAULT_LIMIT: 250
    },
    CHART: {
        COLORS: {
            PRIMARY: '#4CAF50',
            WARNING: '#ff5252',
            BACKGROUND: 'rgba(76, 175, 80, 0.1)'
        }
    }
};

// Storage Utility
class StorageManager {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Storage error (${key}):`, error);
            return false;
        }
    }

    static get(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Storage error (${key}):`, error);
            return defaultValue;
        }
    }
}

// Caffeine Entry Manager
class CaffeineManager {
    constructor() {
        this.entries = StorageManager.get('caffeineEntries', []);
        this.personalLimit = this.loadPersonalLimit();
    }

    loadPersonalLimit() {
        const storedLimit = parseInt(localStorage.getItem('personalCaffeineLimit'));
        return storedLimit && !isNaN(storedLimit) && 
            storedLimit >= CONFIG.CAFFEINE.MIN_LIMIT && 
            storedLimit <= CONFIG.CAFFEINE.MAX_LIMIT
            ? storedLimit : CONFIG.CAFFEINE.DEFAULT_LIMIT;
    }

    addEntry(time, amount) {
        const entryTime = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        entryTime.setHours(hours, minutes, 0, 0);

        this.entries.push({
            time: entryTime.toISOString(),
            amount: amount
        });
        this.save();
    }

    updateEntry(index, time, amount) {
        const entryTime = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        entryTime.setHours(hours, minutes, 0, 0);

        this.entries[index] = {
            time: entryTime.toISOString(),
            amount: amount
        };
        this.save();
    }

    deleteEntry(index) {
        this.entries.splice(index, 1);
        this.save();
    }

    clearEntries() {
        this.entries = [];
        this.save();
    }

    updatePersonalLimit(newLimit) {
        if (!isNaN(newLimit) && 
            newLimit >= CONFIG.CAFFEINE.MIN_LIMIT && 
            newLimit <= CONFIG.CAFFEINE.MAX_LIMIT) {
            this.personalLimit = newLimit;
            StorageManager.set('personalCaffeineLimit', newLimit);
            return true;
        }
        return false;
    }

    save() {
        StorageManager.set('caffeineEntries', this.entries);
    }

    calculateCaffeineLevel(entryTime, entryAmount, targetTime) {
        const timeDiff = (targetTime - entryTime) / (1000 * 60 * 60);
        return timeDiff < 0 ? 0 : 
            entryAmount * Math.pow(0.5, timeDiff / CONFIG.CAFFEINE.HALF_LIFE);
    }
}

// UI Manager
class UIManager {
    constructor(caffeineManager) {
        this.caffeineManager = caffeineManager;
        this.currentChart = null;
        this.initializeElements();
        this.setupEventListeners();
        this.updateDisplay();
    }

    initializeElements() {
        this.elements = {
            form: document.getElementById('caffeine-form'),
            timeInput: document.getElementById('time'),
            amountInput: document.getElementById('amount'),
            chartCtx: document.getElementById('caffeine-chart').getContext('2d'),
            entriesList: document.getElementById('entries-list'),
            editForm: document.getElementById('edit-form'),
            editTimeInput: document.getElementById('edit-time'),
            editAmountInput: document.getElementById('edit-amount'),
            editIndexInput: document.getElementById('edit-index'),
            clearButton: document.getElementById('clear-entries'),
            deleteButton: document.getElementById('delete-entry'),
            warning: document.getElementById('caffeine-warning'),
            warningTime: document.getElementById('warning-time'),
            limitInput: document.getElementById('caffeine-limit'),
            saveLimitButton: document.getElementById('save-limit')
        };
        
        // Set initial values
        this.elements.limitInput.value = this.caffeineManager.personalLimit;
        this.setCurrentTime();
    }

    setupEventListeners() {
        this.elements.form.addEventListener('submit', (e) => this.handleNewEntry(e));
        this.elements.editForm.addEventListener('submit', (e) => this.handleEditEntry(e));
        this.elements.clearButton.addEventListener('click', () => this.handleClearEntries());
        this.elements.deleteButton.addEventListener('click', () => this.handleDeleteEntry());
        this.elements.saveLimitButton.addEventListener('click', () => this.handleLimitUpdate());
        document.getElementById('cancel-edit').addEventListener('click', () => this.hideEditForm());
    }

    setCurrentTime() {
        const now = new Date();
        this.elements.timeInput.value = 
            `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    handleNewEntry(e) {
        e.preventDefault();
        const time = this.elements.timeInput.value;
        const amount = parseInt(this.elements.amountInput.value, 10);

        if (!time || isNaN(amount) || amount <= 0) {
            alert('Please enter valid time and amount.');
            return;
        }

        this.caffeineManager.addEntry(time, amount);
        this.elements.form.reset();
        this.setCurrentTime();
        this.updateDisplay();
    }

    handleEditEntry(e) {
        e.preventDefault();
        const index = parseInt(this.elements.editIndexInput.value, 10);
        const time = this.elements.editTimeInput.value;
        const amount = parseInt(this.elements.editAmountInput.value, 10);

        if (!time || isNaN(amount) || amount <= 0) {
            alert('Please enter valid time and amount.');
            return;
        }

        this.caffeineManager.updateEntry(index, time, amount);
        this.hideEditForm();
        this.updateDisplay();
    }

    handleDeleteEntry() {
        if (confirm('Are you sure you want to delete this entry?')) {
            const index = parseInt(this.elements.editIndexInput.value, 10);
            this.caffeineManager.deleteEntry(index);
            this.hideEditForm();
            this.updateDisplay();
        }
    }

    handleClearEntries() {
        if (confirm('Are you sure you want to clear all entries? This action cannot be undone.')) {
            this.caffeineManager.clearEntries();
            this.updateDisplay();
        }
    }

    handleLimitUpdate() {
        const newLimit = parseInt(this.elements.limitInput.value);
        if (this.caffeineManager.updatePersonalLimit(newLimit)) {
            alert(`Personal caffeine limit set to ${newLimit}mg`);
            this.updateDisplay();
        } else {
            alert(`Please enter a valid number between ${CONFIG.CAFFEINE.MIN_LIMIT} and ${CONFIG.CAFFEINE.MAX_LIMIT}`);
            this.elements.limitInput.value = this.caffeineManager.personalLimit;
        }
    }

    showEditForm(index) {
        const entry = this.caffeineManager.entries[index];
        const entryDate = new Date(entry.time);
        this.elements.editTimeInput.value = 
            `${entryDate.getHours().toString().padStart(2, '0')}:${entryDate.getMinutes().toString().padStart(2, '0')}`;
        this.elements.editAmountInput.value = entry.amount;
        this.elements.editIndexInput.value = index;
        this.elements.editForm.style.display = 'block';
        this.elements.deleteButton.disabled = false;
    }

    hideEditForm() {
        this.elements.editForm.style.display = 'none';
        this.elements.deleteButton.disabled = true;
    }

    updateDisplay() {
        this.updateChart();
        this.displayEntries();
    }

    displayEntries() {
        this.elements.entriesList.innerHTML = '';
        [...this.caffeineManager.entries]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .forEach((entry, index) => {
                const listItem = document.createElement('li');
                const entryTime = new Date(entry.time);
                listItem.textContent = `${entryTime.toLocaleTimeString([], { 
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })} - ${entry.amount}mg`;
                listItem.addEventListener('click', () => this.showEditForm(index));
                this.elements.entriesList.appendChild(listItem);
            });
    }

    prepareChartData() {
        if (this.caffeineManager.entries.length === 0) {
            return { timePoints: [], levels: [], maxLevel: 0 };
        }

        const sortedEntries = [...this.caffeineManager.entries]
            .sort((a, b) => new Date(a.time) - new Date(b.time));

        const now = new Date();
        const firstEntryTime = new Date(sortedEntries[0].time);
        const startTime = new Date(Math.max(firstEntryTime, new Date(now - 24 * 60 * 60 * 1000)));

        const timePoints = [];
        const levels = [];
        let currentTime = new Date(startTime);
        currentTime.setMinutes(Math.floor(currentTime.getMinutes() / 30) * 30, 0, 0);
        let maxLevel = 0;
        let thresholdEndTime = null;

        while (currentTime <= now) {
            let totalCaffeine = 0;
            for (const entry of sortedEntries) {
                const entryTime = new Date(entry.time);
                if (entryTime > currentTime) continue;
                const level = this.caffeineManager.calculateCaffeineLevel(
                    entryTime, entry.amount, currentTime);
                totalCaffeine += level;
            }

            if (totalCaffeine >= CONFIG.CAFFEINE.NEGLIGIBLE) {
                timePoints.push(currentTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                }));
                levels.push(totalCaffeine);
                maxLevel = Math.max(maxLevel, totalCaffeine);

                if (totalCaffeine > this.caffeineManager.personalLimit && !thresholdEndTime) {
                    thresholdEndTime = new Date(currentTime);
                }
            }

            currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
        }

        return { timePoints, levels, maxLevel, thresholdEndTime };
    }

    updateChart() {
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const chartData = this.prepareChartData();
        this.updateWarningDisplay(chartData.maxLevel, chartData.thresholdEndTime);
        this.createChart(chartData);
    }

    updateWarningDisplay(maxLevel, thresholdEndTime) {
        if (maxLevel > this.caffeineManager.personalLimit) {
            this.elements.warning.style.display = 'block';
            this.elements.warningTime.textContent = thresholdEndTime
                ? `Level will be safe after ${thresholdEndTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })}`
                : "Level will remain high for the rest of the day";
        } else {
            this.elements.warning.style.display = 'none';
        }
    }

    createChart({ timePoints, levels, maxLevel }) {
        if (!Chart.annotation) {
            console.error('Chart.js annotation plugin not loaded');
            return;
        }

        Chart.register(Chart.annotation);
        
        const chartConfig = {
            type: 'line',
            data: {
                labels: timePoints,
                datasets: [{
                    label: 'Caffeine Level (mg)',
                    data: levels,
                    borderColor: CONFIG.CHART.COLORS.PRIMARY,
                    backgroundColor: CONFIG.CHART.COLORS.BACKGROUND,
                    fill: true,
                    tension: 0.2,
                    borderWidth: 2,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    annotation: {
                        annotations: {
                            limit: {
                                type: 'line',
                                yMin: this.caffeineManager.personalLimit,
                                yMax: this.caffeineManager.personalLimit,
                                borderColor: CONFIG.CHART.COLORS.WARNING,
                                borderWidth: 1,
                                borderDash: [5, 5]
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { display: false }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        max: Math.max(this.caffeineManager.personalLimit, maxLevel) * 1.1
                    }
                }
            }
        };

        try {
            this.currentChart = new Chart(this.elements.chartCtx, chartConfig);
        } catch (error) {
            console.error('Error creating chart:', error);
        }
    }
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    const caffeineManager = new CaffeineManager();
    new UIManager(caffeineManager);
});
