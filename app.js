// app.js

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const CAFFEINE_HALF_LIFE = 5; // in hours

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

    // Add this near the top with other element selections
    const clearEntriesButton = document.getElementById('clear-entries');
    const deleteEntryButton = document.getElementById('delete-entry');
    const caffeineWarning = document.getElementById('caffeine-warning');
    const warningTimeElement = document.getElementById('warning-time');

    // Add these new elements
    const caffeineLimitInput = document.getElementById('caffeine-limit');
    const saveLimitButton = document.getElementById('save-limit');

    // Add this variable to store the personal limit
    let personalCaffeineLimit = parseInt(localStorage.getItem('personalCaffeineLimit')) || 250;

    // Set the initial value of the input
    caffeineLimitInput.value = personalCaffeineLimit;

    // Set default time to current time
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    timeInput.value = currentTime;

    // Function to save the personal limit
    function savePersonalLimit() {
        const newLimit = parseInt(caffeineLimitInput.value);
        if (!isNaN(newLimit) && newLimit > 0) {
            personalCaffeineLimit = newLimit;
            localStorage.setItem('personalCaffeineLimit', newLimit);
            alert(`Personal caffeine limit set to ${newLimit}mg`);
            updateChart(); // Update the chart to reflect the new limit
        } else {
            alert('Please enter a valid number greater than 0');
        }
    }

    // Add event listener for the save limit button
    saveLimitButton.addEventListener('click', savePersonalLimit);

    // Data Storage (Using Local Storage)
    let caffeineEntries = [];
    try {
        caffeineEntries = JSON.parse(localStorage.getItem('caffeineEntries')) || [];
    } catch (error) {
        console.error('Error loading caffeine entries:', error);
        caffeineEntries = [];
    }

    // Function to calculate caffeine level at a specific time
    function calculateCaffeineLevel(entryTime, entryAmount, targetTime) {
        const timeDiff = (targetTime - entryTime) / (1000 * 60 * 60); // in hours
        if (timeDiff < 0) return 0;
        const level = entryAmount * Math.pow(0.5, timeDiff / CAFFEINE_HALF_LIFE);
        return level;
    }

    // Function to update the chart
    function updateChart() {
        if (caffeineEntries.length === 0) {
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.update();
            return;
        }

        // Sort entries by time
        caffeineEntries.sort((a, b) => new Date(a.time) - new Date(b.time));

        const firstEntryTime = new Date(caffeineEntries[0].time);
        const lastEntryTime = new Date();
        lastEntryTime.setHours(23, 59, 59, 999); // End of today

        // Generate time points every 15 minutes
        const timePoints = [];
        const caffeineLevels = [];

        let currentTime = new Date(firstEntryTime);
        currentTime.setMinutes(0, 0, 0); // Round to the nearest hour

        let maxCaffeineLevel = 0;
        let exceedsThreshold = false;
        let thresholdEndTime = null;

        while (currentTime <= lastEntryTime) {
            timePoints.push(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            // Calculate total caffeine at currentTime
            let totalCaffeine = 0;
            caffeineEntries.forEach(entry => {
                const entryTime = new Date(entry.time);
                const caffeineLevel = calculateCaffeineLevel(entryTime, entry.amount, currentTime);
                totalCaffeine += caffeineLevel;
            });
            caffeineLevels.push(totalCaffeine.toFixed(2));
            
            if (totalCaffeine > personalCaffeineLimit) {
                exceedsThreshold = true;
            } else if (exceedsThreshold && !thresholdEndTime) {
                thresholdEndTime = new Date(currentTime);
            }
            
            maxCaffeineLevel = Math.max(maxCaffeineLevel, totalCaffeine);
            currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
        }

        // Check if max caffeine level exceeds the personal limit and show/hide warning
        if (maxCaffeineLevel > personalCaffeineLimit) {
            caffeineWarning.style.display = 'block';
            if (thresholdEndTime) {
                warningTimeElement.textContent = `Your amount is too high until ${thresholdEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                warningTimeElement.textContent = "Your amount is too high for the rest of the day";
            }
        } else {
            caffeineWarning.style.display = 'none';
        }

        // Update Chart
        chart.data.labels = timePoints;
        chart.data.datasets[0].data = caffeineLevels;
        chart.update();
    }

    // Initialize Chart
    const chart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Caffeine Level (mg)',
                data: [],
                borderColor: 'rgba(59, 130, 246, 1)', // Vibrant blue
                backgroundColor: 'rgba(59, 130, 246, 0.18)', // Light blue fill
                fill: true,
                tension: 0.3,
                borderWidth: 4,
                pointBackgroundColor: '#fff',
                pointBorderColor: 'rgba(59, 130, 246, 1)',
                pointRadius: 6,
                pointHoverRadius: 9,
                shadowOffsetX: 0,
                shadowOffsetY: 2,
                shadowBlur: 8,
                shadowColor: 'rgba(59,130,246,0.18)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#1a1a1a',
                        font: { weight: 'bold', size: 16 }
                    }
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#222',
                    bodyColor: '#222',
                    borderColor: '#3b82f6',
                    borderWidth: 1
                }
            },
            layout: {
                padding: 16
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#1a1a1a',
                        font: { weight: 'bold', size: 15 }
                    },
                    ticks: {
                        color: '#222',
                        font: { size: 13 }
                    },
                    grid: {
                        color: 'rgba(59,130,246,0.08)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Caffeine (mg)',
                        color: '#1a1a1a',
                        font: { weight: 'bold', size: 15 }
                    },
                    beginAtZero: true,
                    ticks: {
                        color: '#222',
                        font: { size: 13 }
                    },
                    grid: {
                        color: 'rgba(59,130,246,0.08)'
                    }
                }
            }
        }
    });
    console.log('Chart object:', chart);

    // Add this new function to display entries
    function displayEntries() {
        console.log('Displaying entries:', caffeineEntries);
        entriesListElement.innerHTML = '';
        caffeineEntries.forEach((entry, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${entry.amount}mg`;
            listItem.addEventListener('click', () => showEditForm(index));
            entriesListElement.appendChild(listItem);
        });
        console.log('Entries list HTML:', entriesListElement.innerHTML);
    }

    // Update this function to show the edit form
    function showEditForm(index) {
        const entry = caffeineEntries[index];
        const entryDate = new Date(entry.time);
        editTimeInput.value = `${entryDate.getHours().toString().padStart(2, '0')}:${entryDate.getMinutes().toString().padStart(2, '0')}`;
        editAmountInput.value = entry.amount;
        editIndexInput.value = index;
        editFormElement.style.display = 'block';
        deleteEntryButton.disabled = false; // Enable the delete button
    }

    // Add this event listener for the cancel button
    document.getElementById('cancel-edit').addEventListener('click', () => {
        editFormElement.style.display = 'none';
        deleteEntryButton.disabled = true; // Disable the delete button when canceling
    });

    // Update the edit form event listener
    editFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const index = parseInt(editIndexInput.value, 10);
        const timeValue = editTimeInput.value;
        const amountValue = parseInt(editAmountInput.value, 10);

        if (!timeValue || isNaN(amountValue) || amountValue <= 0) {
            alert('Please enter valid time and amount.');
            return;
        }

        // Update the entry
        const [hours, minutes] = timeValue.split(':').map(Number);
        const entryTime = new Date(caffeineEntries[index].time);
        entryTime.setHours(hours, minutes, 0, 0);

        caffeineEntries[index] = {
            time: entryTime.toISOString(),
            amount: amountValue
        };

        // Save to Local Storage
        localStorage.setItem('caffeineEntries', JSON.stringify(caffeineEntries));

        // Reset form and hide it
        editFormElement.reset();
        editFormElement.style.display = 'none';

        // Update display and chart
        displayEntries();
        updateChart();
    });

    // Modify the existing form submission listener
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const timeValue = timeInput.value;
        const amountValue = parseInt(amountInput.value, 10);

        if (!timeValue || isNaN(amountValue) || amountValue <= 0) {
            alert('Please enter valid time and amount.');
            return;
        }

        // Create Date object for the entry
        const [hours, minutes] = timeValue.split(':').map(Number);
        const entryTime = new Date();
        entryTime.setHours(hours, minutes, 0, 0);

        // Add entry to the list
        caffeineEntries.push({
            time: entryTime.toISOString(),
            amount: amountValue
        });

        console.log('New entry added:', { time: entryTime.toISOString(), amount: amountValue });

        // Save to Local Storage
        localStorage.setItem('caffeineEntries', JSON.stringify(caffeineEntries));

        // Reset form
        form.reset();

        // Update Chart
        updateChart();

        // Update the entries display
        displayEntries();
    });

    // Initialize from stored data
    caffeineEntries = JSON.parse(localStorage.getItem('caffeineEntries')) || [];

    // Initial Chart Update
    updateChart();

    // Display initial entries
    displayEntries();

    // Add this function to clear all entries
    function clearAllEntries() {
        if (confirm('Are you sure you want to clear all entries? This action cannot be undone.')) {
            caffeineEntries = [];
            localStorage.removeItem('caffeineEntries');
            updateChart();
            displayEntries();
        }
    }

    // Add this event listener for the clear entries button
    clearEntriesButton.addEventListener('click', clearAllEntries);

    // Add this function to delete an entry
    function deleteEntry(index) {
        if (confirm('Are you sure you want to delete this entry?')) {
            caffeineEntries.splice(index, 1);
            localStorage.setItem('caffeineEntries', JSON.stringify(caffeineEntries));
            editFormElement.style.display = 'none';
            updateChart();
            displayEntries();
        }
    }

    // Add this event listener for the delete button
    deleteEntryButton.addEventListener('click', () => {
        const index = parseInt(editIndexInput.value, 10);
        deleteEntry(index);
    });

    console.log('Entries list element:', entriesListElement);
    console.log('Clear entries button:', clearEntriesButton);

    console.log('Chart context:', chartCtx);

    // Add this at the very bottom of app.js
    console.log('app.js has finished loading');
});