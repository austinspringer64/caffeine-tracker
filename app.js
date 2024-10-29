// app.js

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const CAFFEINE_HALF_LIFE = 5; // in hours
    const MIN_CAFFEINE_LIMIT = 1;
    const MAX_CAFFEINE_LIMIT = 1000;
    const NEGLIGIBLE_CAFFEINE = 1; // Stop plotting when level drops below 1mg
    let currentChart = null; // Track chart instance for proper cleanup

    // Elements
    const form = document.getElementById('caffeine-form');
    const timeInput = document.getElementById('time');
    const amountInput = document.getElementById('amount');
    const chartCtx = document.getElementById('caffeine-chart').getContext('2d');
    const entriesListElement = document.getElementById('entries-list');
    const editFormElement = document.getElementById('edit-form');
    const editTimeInput = document.getElementById('edit-time');
    const editAmountInput = document.getElementById('edit-amount');
    const editIndexInput = document.getElementById('edit-index');
    const clearEntriesButton = document.getElementById('clear-entries');
    const deleteEntryButton = document.getElementById('delete-entry');
    const caffeineWarning = document.getElementById('caffeine-warning');
    const warningTimeElement = document.getElementById('warning-time');
    const caffeineLimitInput = document.getElementById('caffeine-limit');
    const saveLimitButton = document.getElementById('save-limit');

    // Load personal limit with validation
    let personalCaffeineLimit;
    try {
        const storedLimit = parseInt(localStorage.getItem('personalCaffeineLimit'));
        personalCaffeineLimit = storedLimit && !isNaN(storedLimit) && 
            storedLimit >= MIN_CAFFEINE_LIMIT && storedLimit <= MAX_CAFFEINE_LIMIT
            ? storedLimit : 250;
    } catch (error) {
        console.error('Error loading caffeine limit:', error);
        personalCaffeineLimit = 250;
    }
    caffeineLimitInput.value = personalCaffeineLimit;

    // Function to safely interact with localStorage
    const safeStorage = {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error(`Error saving to localStorage (${key}):`, error);
                return false;
            }
        },
        get: (key, defaultValue) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error(`Error reading from localStorage (${key}):`, error);
                return defaultValue;
            }
        }
    };

    // Function to save the personal limit with validation
    function savePersonalLimit() {
        const newLimit = parseInt(caffeineLimitInput.value);
        if (!isNaN(newLimit) && newLimit >= MIN_CAFFEINE_LIMIT && newLimit <= MAX_CAFFEINE_LIMIT) {
            personalCaffeineLimit = newLimit;
            safeStorage.set('personalCaffeineLimit', newLimit);
            alert(`Personal caffeine limit set to ${newLimit}mg`);
            updateChart();
        } else {
            alert(`Please enter a valid number between ${MIN_CAFFEINE_LIMIT} and ${MAX_CAFFEINE_LIMIT}`);
            caffeineLimitInput.value = personalCaffeineLimit; // Reset to previous valid value
        }
    }

    saveLimitButton.addEventListener('click', savePersonalLimit);

    // Data Storage
    let caffeineEntries = safeStorage.get('caffeineEntries', []);

    // Function to calculate caffeine level with timezone handling
    function calculateCaffeineLevel(entryTime, entryAmount, targetTime) {
        const timeDiff = (targetTime - entryTime) / (1000 * 60 * 60); // in hours
        if (timeDiff < 0) return 0;
        return entryAmount * Math.pow(0.5, timeDiff / CAFFEINE_HALF_LIFE);
    }

    // Function to update the chart with proper cleanup
    function updateChart() {
        if (currentChart) {
            currentChart.destroy(); // Cleanup old chart instance
        }

        if (caffeineEntries.length === 0) {
            currentChart = new Chart(chartCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Caffeine Level (mg)',
                        data: [],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        fill: true
                    }]
                }
            });
            return;
        }

        // Sort entries by time
        caffeineEntries.sort((a, b) => new Date(a.time) - new Date(b.time));

        const firstEntryTime = new Date(caffeineEntries[0].time);
        const lastEntryTime = new Date();
        lastEntryTime.setHours(23, 59, 59, 999);

        const timePoints = [];
        const caffeineLevels = [];
        let currentTime = new Date(firstEntryTime);
        currentTime.setMinutes(Math.floor(currentTime.getMinutes() / 15) * 15, 0, 0);

        let maxCaffeineLevel = 0;
        let exceedsThreshold = false;
        let thresholdEndTime = null;
        let consecutiveLowLevels = 0;

        while (currentTime <= lastEntryTime) {
            let totalCaffeine = 0;
            caffeineEntries.forEach(entry => {
                const entryTime = new Date(entry.time);
                const caffeineLevel = calculateCaffeineLevel(entryTime, entry.amount, currentTime);
                totalCaffeine += caffeineLevel;
            });

            // Stop plotting if caffeine level is negligible for 4 consecutive points (1 hour)
            if (totalCaffeine < NEGLIGIBLE_CAFFEINE) {
                consecutiveLowLevels++;
                if (consecutiveLowLevels >= 4) {
                    break;
                }
            } else {
                consecutiveLowLevels = 0;
            }

            timePoints.push(currentTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            }));

            caffeineLevels.push(parseFloat(totalCaffeine.toFixed(2)));
            
            if (totalCaffeine > personalCaffeineLimit) {
                exceedsThreshold = true;
            } else if (exceedsThreshold && !thresholdEndTime) {
                thresholdEndTime = new Date(currentTime);
            }
            
            maxCaffeineLevel = Math.max(maxCaffeineLevel, totalCaffeine);
            currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
        }

        // Update warning display
        if (maxCaffeineLevel > personalCaffeineLimit) {
            caffeineWarning.style.display = 'block';
            warningTimeElement.textContent = thresholdEndTime
                ? `Level will be safe after ${thresholdEndTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })}`
                : "Level will remain high for the rest of the day";
        } else {
            caffeineWarning.style.display = 'none';
        }

        // Create new chart with enhanced styling
        currentChart = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: timePoints,
                datasets: [{
                    label: 'Caffeine Level (mg)',
                    data: caffeineLevels,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#4CAF50',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#4CAF50'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                size: 14,
                                family: "'Arial', sans-serif"
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14,
                            family: "'Arial', sans-serif"
                        },
                        bodyFont: {
                            size: 13,
                            family: "'Arial', sans-serif"
                        },
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Caffeine: ${context.parsed.y.toFixed(1)}mg`;
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            limit: {
                                type: 'line',
                                yMin: personalCaffeineLimit,
                                yMax: personalCaffeineLimit,
                                borderColor: '#ff5252',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: 'Daily Limit',
                                    enabled: true,
                                    position: 'end',
                                    backgroundColor: '#ff5252',
                                    font: {
                                        size: 12,
                                        family: "'Arial', sans-serif"
                                    }
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                size: 14,
                                weight: 'bold',
                                family: "'Arial', sans-serif"
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 12,
                                family: "'Arial', sans-serif"
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Caffeine (mg)',
                            font: {
                                size: 14,
                                weight: 'bold',
                                family: "'Arial', sans-serif"
                            }
                        },
                        beginAtZero: true,
                        suggestedMax: Math.max(personalCaffeineLimit * 1.2, maxCaffeineLevel * 1.1),
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 12,
                                family: "'Arial', sans-serif"
                            }
                        }
                    }
                }
            }
        });
    }

    function displayEntries() {
        entriesListElement.innerHTML = '';
        caffeineEntries.sort((a, b) => new Date(b.time) - new Date(a.time)); // Sort newest first
        
        caffeineEntries.forEach((entry, index) => {
            const listItem = document.createElement('li');
            const entryTime = new Date(entry.time);
            listItem.textContent = `${entryTime.toLocaleTimeString([], { 
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })} - ${entry.amount}mg`;
            listItem.addEventListener('click', () => showEditForm(index));
            entriesListElement.appendChild(listItem);
        });
    }

    function showEditForm(index) {
        const entry = caffeineEntries[index];
        const entryDate = new Date(entry.time);
        editTimeInput.value = `${entryDate.getHours().toString().padStart(2, '0')}:${entryDate.getMinutes().toString().padStart(2, '0')}`;
        editAmountInput.value = entry.amount;
        editIndexInput.value = index;
        editFormElement.style.display = 'block';
        deleteEntryButton.disabled = false;
    }

    document.getElementById('cancel-edit').addEventListener('click', () => {
        editFormElement.style.display = 'none';
        deleteEntryButton.disabled = true;
    });

    editFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const index = parseInt(editIndexInput.value, 10);
        const timeValue = editTimeInput.value;
        const amountValue = parseInt(editAmountInput.value, 10);

        if (!timeValue || isNaN(amountValue) || amountValue <= 0) {
            alert('Please enter valid time and amount.');
            return;
        }

        const [hours, minutes] = timeValue.split(':').map(Number);
        const entryTime = new Date();
        entryTime.setHours(hours, minutes, 0, 0);

        caffeineEntries[index] = {
            time: entryTime.toISOString(),
            amount: amountValue
        };

        safeStorage.set('caffeineEntries', caffeineEntries);
        editFormElement.reset();
        editFormElement.style.display = 'none';
        displayEntries();
        updateChart();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const timeValue = timeInput.value;
        const amountValue = parseInt(amountInput.value, 10);

        if (!timeValue || isNaN(amountValue) || amountValue <= 0) {
            alert('Please enter valid time and amount.');
            return;
        }

        const [hours, minutes] = timeValue.split(':').map(Number);
        const entryTime = new Date();
        entryTime.setHours(hours, minutes, 0, 0);

        caffeineEntries.push({
            time: entryTime.toISOString(),
            amount: amountValue
        });

        safeStorage.set('caffeineEntries', caffeineEntries);
        form.reset();
        
        // Set default time to current time
        const now = new Date();
        timeInput.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        updateChart();
        displayEntries();
    });

    function clearAllEntries() {
        if (confirm('Are you sure you want to clear all entries? This action cannot be undone.')) {
            caffeineEntries = [];
            safeStorage.set('caffeineEntries', caffeineEntries);
            updateChart();
            displayEntries();
        }
    }

    clearEntriesButton.addEventListener('click', clearAllEntries);

    function deleteEntry(index) {
        if (confirm('Are you sure you want to delete this entry?')) {
            caffeineEntries.splice(index, 1);
            safeStorage.set('caffeineEntries', caffeineEntries);
            editFormElement.style.display = 'none';
            updateChart();
            displayEntries();
        }
    }

    deleteEntryButton.addEventListener('click', () => {
        const index = parseInt(editIndexInput.value, 10);
        deleteEntry(index);
    });

    // Register Service Worker with relative path
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

    // Set initial time input to current time
    const now = new Date();
    timeInput.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Initial display
    updateChart();
    displayEntries();
});
