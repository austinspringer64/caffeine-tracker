// app.js

document.addEventListener('DOMContentLoaded', function () {
    // ===== Constants =====
    const CAFFEINE_HALF_LIFE = 5; // hours
    const CHART_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    const MS_PER_HOUR = 1000 * 60 * 60;
    const DEFAULT_CAFFEINE_LIMIT = 250; // mg
    const HERO_UPDATE_INTERVAL_MS = 60 * 1000; // 1 minute
    const SNACKBAR_TIMEOUT_MS = 5000; // 5 seconds
    const TOAST_DURATION_MS = 3000; // 3 seconds
    const STORAGE_KEYS = {
        ENTRIES: 'caffeineEntries',
        LIMIT: 'personalCaffeineLimit',
    };

    const DRINK_PRESETS = [
        { label: 'Coffee', emoji: '☕', amount: 95 },
        { label: 'Espresso', emoji: '☕', amount: 63 },
        { label: 'Red Bull', emoji: '⚡', amount: 80 },
        { label: 'Tea', emoji: '🍵', amount: 47 },
        { label: 'Coke', emoji: '🥤', amount: 34 },
    ];
    void DRINK_PRESETS; // Referenced in HTML button data-attributes

    // ===== DOM Elements =====
    const form = document.getElementById('caffeine-form');
    const timeInput = document.getElementById('time');
    const amountInput = document.getElementById('amount');
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
    const dateFilterInput = document.getElementById('date-filter');
    const datePrevBtn = document.getElementById('date-prev');
    const dateNextBtn = document.getElementById('date-next');
    const chartContainer = document.getElementById('chart-container');
    const chartFallback = document.getElementById('chart-fallback');
    const emptyState = document.getElementById('empty-state');
    const nowBtn = document.getElementById('now-btn');
    const toastContainer = document.getElementById('toast-container');
    const snackbarContainer = document.getElementById('snackbar-container');
    const heroCurrentLevel = document.getElementById('hero-current-level');
    const heroPeak = document.getElementById('hero-peak');
    const heroCount = document.getElementById('hero-count');
    const budgetText = document.getElementById('budget-text');
    const budgetBarFill = document.getElementById('budget-bar-fill');
    const budgetRemaining = document.getElementById('budget-remaining');

    // ===== State =====
    let personalCaffeineLimit = loadFromStorage(STORAGE_KEYS.LIMIT, DEFAULT_CAFFEINE_LIMIT);
    let caffeineEntries = loadFromStorage(STORAGE_KEYS.ENTRIES, []);
    let selectedDate = getTodayString();
    let chart = null;
    let chartInitialized = false;
    let heroTimer = null;
    let lastDeleted = null; // For undo
    let snackbarTimer = null;

    // ===== Init =====
    caffeineLimitInput.value = personalCaffeineLimit;
    dateFilterInput.value = selectedDate;
    setTimeToNow(timeInput);
    updateDateNavButtons();

    // --- LocalStorage helpers ---
    function loadFromStorage(key, defaultValue) {
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) {
                return defaultValue;
            }
            const parsed = JSON.parse(stored);
            return parsed !== null && parsed !== undefined ? parsed : defaultValue;
        } catch {
            showToast('Error loading data', 'error');
            return defaultValue;
        }
    }

    function saveToStorage(_key, value) {
        try {
            localStorage.setItem(_key, JSON.stringify(value));
        } catch {
            showToast('Error saving data', 'error');
        }
    }

    function removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch {
            showToast('Error clearing data', 'error');
        }
    }
    void removeFromStorage; // Utility function, available for future use

    // --- Date helpers ---
    function getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    function offsetDate(dateStr, days) {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    function setTimeToNow(inputElement) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        inputElement.value = currentTime;
    }

    function getDateEntries(entries, dateStr) {
        return entries.filter(entry => {
            const entryDate = new Date(entry.time);
            return entryDate.toISOString().split('T')[0] === dateStr;
        });
    }

    // --- Core logic ---
    function calculateCaffeineLevel(entryTime, entryAmount, targetTime) {
        const timeDiff = (targetTime - entryTime) / MS_PER_HOUR;
        if (timeDiff < 0) {
            return 0;
        }
        return entryAmount * Math.pow(0.5, timeDiff / CAFFEINE_HALF_LIFE);
    }

    function getCurrentCaffeineLevel(dayEntries, targetTime) {
        let total = 0;
        dayEntries.forEach(entry => {
            const entryTime = new Date(entry.time);
            total += calculateCaffeineLevel(entryTime, entry.amount, targetTime);
        });
        return total;
    }

    // --- Toast System (replaces alert) ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', function () {
                toast.remove();
            });
        }, TOAST_DURATION_MS);
    }

    // --- Snackbar System (Undo) ---
    function showSnackbar(message, actionText, actionCallback) {
        // Clear any existing snackbar
        clearSnackbar();

        const snackbar = document.createElement('div');
        snackbar.className = 'snackbar';
        snackbar.id = 'active-snackbar';
        snackbar.innerHTML = `<span>${message}</span>`;

        const actionBtn = document.createElement('button');
        actionBtn.className = 'snackbar-action';
        actionBtn.textContent = actionText;
        actionBtn.addEventListener('click', function () {
            actionCallback();
            clearSnackbar();
        });
        snackbar.appendChild(actionBtn);

        snackbarContainer.appendChild(snackbar);

        snackbarTimer = setTimeout(function () {
            clearSnackbar();
        }, SNACKBAR_TIMEOUT_MS);
    }

    function clearSnackbar() {
        if (snackbarTimer) {
            clearTimeout(snackbarTimer);
            snackbarTimer = null;
        }
        const existing = document.getElementById('active-snackbar');
        if (existing) {
            existing.classList.add('snackbar-exit');
            existing.addEventListener('animationend', function () {
                existing.remove();
            });
        }
    }

    // --- Date Navigation ---
    function updateDateNavButtons() {
        const today = getTodayString();
        dateNextBtn.disabled = selectedDate === today;
    }

    datePrevBtn.addEventListener('click', function () {
        clearSnackbar();
        selectedDate = offsetDate(selectedDate, -1);
        dateFilterInput.value = selectedDate;
        displayEntries();
        updateChart();
        updateHeroStat();
    });

    dateNextBtn.addEventListener('click', function () {
        clearSnackbar();
        const today = getTodayString();
        if (selectedDate !== today) {
            selectedDate = offsetDate(selectedDate, 1);
            dateFilterInput.value = selectedDate;
            displayEntries();
            updateChart();
            updateHeroStat();
            updateDateNavButtons();
        }
    });

    dateFilterInput.addEventListener('change', function () {
        clearSnackbar();
        selectedDate = this.value;
        displayEntries();
        updateChart();
        updateHeroStat();
        updateDateNavButtons();
    });

    // --- "Now" Button ---
    nowBtn.addEventListener('click', function () {
        setTimeToNow(timeInput);
    });

    // --- Quick-Select Drinks ---
    const drinkButtons = document.querySelectorAll('.btn-drink');
    drinkButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const amount = parseInt(this.dataset.amount, 10);
            amountInput.value = amount;
            amountInput.focus();

            // Visual feedback
            drinkButtons.forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
        });
    });

    amountInput.addEventListener('input', function () {
        drinkButtons.forEach(function (b) { b.classList.remove('active'); });
    });

    // --- Personal Limit ---
    function savePersonalLimit() {
        const newLimit = parseInt(caffeineLimitInput.value, 10);
        if (!isNaN(newLimit) && newLimit > 0) {
            personalCaffeineLimit = newLimit;
            saveToStorage(STORAGE_KEYS.LIMIT, newLimit);
            showToast('Limit saved ✓', 'success');
            updateBudgetBar();
            updateChart();
            updateHeroStat();
        } else {
            showToast('Please enter a valid number greater than 0', 'error');
        }
    }

    saveLimitButton.addEventListener('click', savePersonalLimit);

    // --- Budget Progress Bar ---
    function updateBudgetBar() {
        const dayEntries = getDateEntries(caffeineEntries, selectedDate);
        let totalCaffeine = 0;
        dayEntries.forEach(function (entry) { totalCaffeine += entry.amount; });

        const percentage = Math.min((totalCaffeine / personalCaffeineLimit) * 100, 100);
        const remaining = personalCaffeineLimit - totalCaffeine;

        budgetText.textContent = `${totalCaffeine} / ${personalCaffeineLimit} mg`;
        budgetBarFill.style.width = `${percentage}%`;

        // Color states
        budgetBarFill.classList.remove('state-safe', 'state-caution', 'state-danger');
        if (percentage >= 100) {
            budgetBarFill.classList.add('state-danger');
        } else if (percentage >= 70) {
            budgetBarFill.classList.add('state-caution');
        } else {
            budgetBarFill.classList.add('state-safe');
        }

        if (remaining >= 0) {
            budgetRemaining.textContent = `${remaining} mg remaining`;
            budgetRemaining.classList.remove('over-limit');
        } else {
            budgetRemaining.textContent = `${Math.abs(remaining)} mg over limit!`;
            budgetRemaining.classList.add('over-limit');
        }
    }

    // --- Hero Stat ---
    function updateHeroStat() {
        const dayEntries = getDateEntries(caffeineEntries, selectedDate);
        const now = new Date();

        // Current level
        const currentLevel = getCurrentCaffeineLevel(dayEntries, now);
        heroCurrentLevel.textContent = `${currentLevel.toFixed(1)} mg`;

        // Peak level
        let peakLevel = 0;
        if (dayEntries.length > 0) {
            dayEntries.sort(function (a, b) { return new Date(a.time) - new Date(b.time); });
            const firstEntryTime = new Date(dayEntries[0].time);
            const lastTime = selectedDate === getTodayString() ? now : new Date(selectedDate + 'T23:59:59');

            let t = new Date(firstEntryTime);
            t.setMinutes(0, 0, 0);
            while (t <= lastTime) {
                const level = getCurrentCaffeineLevel(dayEntries, t);
                if (level > peakLevel) {
                    peakLevel = level;
                }
                t = new Date(t.getTime() + CHART_INTERVAL_MS);
            }
        }
        heroPeak.textContent = `${peakLevel.toFixed(1)} mg`;

        // Count
        heroCount.textContent = dayEntries.length;

        // Update budget bar too
        updateBudgetBar();
    }

    // Start live hero updates
    function startHeroTimer() {
        if (heroTimer) {
            clearInterval(heroTimer);
        }
        updateHeroStat();
        heroTimer = setInterval(updateHeroStat, HERO_UPDATE_INTERVAL_MS);
    }

    // --- Chart ---
    function initChart() {
        if (typeof Chart === 'undefined') {
            chartContainer.style.display = 'none';
            chartFallback.style.display = 'block';
            chartInitialized = false;
            return;
        }

        const canvas = document.getElementById('caffeine-chart');
        const ctx = canvas.getContext('2d');

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Caffeine Level (mg)',
                    data: [],
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.18)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: 'rgba(59, 130, 246, 1)',
                    pointRadius: 6,
                    pointHoverRadius: 9,
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
        chartInitialized = true;
    }

    function updateChart() {
        if (!chartInitialized || !chart) {
            renderFallbackSummary();
            return;
        }

        const dayEntries = getDateEntries(caffeineEntries, selectedDate);

        if (dayEntries.length === 0) {
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.update();
            caffeineWarning.style.display = 'none';
            return;
        }

        dayEntries.sort(function (a, b) { return new Date(a.time) - new Date(b.time); });

        const firstEntryTime = new Date(dayEntries[0].time);
        const lastEntryTime = new Date();

        if (selectedDate !== getTodayString()) {
            lastEntryTime.setHours(23, 59, 59, 999);
            const selectedDateObj = new Date(selectedDate + 'T00:00:00');
            firstEntryTime.setTime(selectedDateObj.getTime());
        } else {
            lastEntryTime.setHours(23, 59, 59, 999);
        }

        const timePoints = [];
        const caffeineLevels = [];

        let currentTime = new Date(firstEntryTime);
        currentTime.setMinutes(0, 0, 0);

        let maxCaffeineLevel = 0;
        let exceedsThreshold = false;
        let thresholdEndTime = null;

        while (currentTime <= lastEntryTime) {
            timePoints.push(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            let totalCaffeine = 0;
            dayEntries.forEach(function (entry) {
                const entryTime = new Date(entry.time);
                totalCaffeine += calculateCaffeineLevel(entryTime, entry.amount, currentTime);
            });
            caffeineLevels.push(parseFloat(totalCaffeine.toFixed(2)));

            if (totalCaffeine > personalCaffeineLimit) {
                exceedsThreshold = true;
            } else if (exceedsThreshold && !thresholdEndTime) {
                thresholdEndTime = new Date(currentTime);
            }

            maxCaffeineLevel = Math.max(maxCaffeineLevel, totalCaffeine);
            currentTime = new Date(currentTime.getTime() + CHART_INTERVAL_MS);
        }

        if (maxCaffeineLevel > personalCaffeineLimit) {
            caffeineWarning.style.display = 'block';
            if (thresholdEndTime) {
                warningTimeElement.textContent = `Your amount is too high until ${thresholdEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                warningTimeElement.textContent = 'Your amount is too high for the rest of the day';
            }
        } else {
            caffeineWarning.style.display = 'none';
        }

        chart.data.labels = timePoints;
        chart.data.datasets[0].data = caffeineLevels;
        chart.update();
    }

    function renderFallbackSummary() {
        const dayEntries = getDateEntries(caffeineEntries, selectedDate);
        if (dayEntries.length === 0) {
            chartFallback.textContent = 'No entries for this date.';
            return;
        }

        let totalCaffeine = 0;
        dayEntries.forEach(function (entry) { totalCaffeine += entry.amount; });

        const exceedsLimit = totalCaffeine > personalCaffeineLimit;
        chartFallback.innerHTML = `<strong>${selectedDate}</strong>: ${dayEntries.length} entries, ` +
            `${totalCaffeine}mg total caffeine` +
            (exceedsLimit ? ` <span style="color:#b45309">(exceeds ${personalCaffeineLimit}mg limit!)</span>` : '');
    }

    // --- Display Entries ---
    function displayEntries() {
        const dayEntries = getDateEntries(caffeineEntries, selectedDate);
        dayEntries.sort(function (a, b) { return new Date(a.time) - new Date(b.time); });

        entriesListElement.innerHTML = '';
        dayEntries.forEach(function (entry) {
            const actualIndex = caffeineEntries.indexOf(entry);
            const listItem = document.createElement('li');
            const entryDate = new Date(entry.time);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'entry-time';
            timeSpan.textContent = entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const amountSpan = document.createElement('span');
            amountSpan.className = 'entry-amount';
            amountSpan.textContent = `${entry.amount} mg`;

            listItem.appendChild(timeSpan);
            listItem.appendChild(amountSpan);
            listItem.addEventListener('click', function () { showEditForm(actualIndex); });
            entriesListElement.appendChild(listItem);
        });

        emptyState.style.display = dayEntries.length === 0 ? 'block' : 'none';
    }

    // --- Edit Form ---
    function showEditForm(index) {
        const entry = caffeineEntries[index];
        const entryDate = new Date(entry.time);
        editTimeInput.value = `${entryDate.getHours().toString().padStart(2, '0')}:${entryDate.getMinutes().toString().padStart(2, '0')}`;
        editAmountInput.value = entry.amount;
        editIndexInput.value = index;
        editFormElement.style.display = 'block';
        deleteEntryButton.disabled = false;
        editFormElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    document.getElementById('cancel-edit').addEventListener('click', function () {
        editFormElement.style.display = 'none';
        deleteEntryButton.disabled = true;
    });

    editFormElement.addEventListener('submit', function (e) {
        e.preventDefault();
        const index = parseInt(editIndexInput.value, 10);
        const timeValue = editTimeInput.value;
        const amountValue = parseInt(editAmountInput.value, 10);

        if (!timeValue || isNaN(amountValue) || amountValue <= 0) {
            showToast('Please enter valid time and amount', 'error');
            return;
        }

        const hours = parseInt(timeValue.split(':')[0], 10);
        const minutes = parseInt(timeValue.split(':')[1], 10);
        const entryTime = new Date(caffeineEntries[index].time);
        entryTime.setHours(hours, minutes, 0, 0);

        caffeineEntries[index] = {
            time: entryTime.toISOString(),
            amount: amountValue
        };

        saveToStorage(STORAGE_KEYS.ENTRIES, caffeineEntries);
        editFormElement.reset();
        editFormElement.style.display = 'none';
        displayEntries();
        updateChart();
        updateHeroStat();
        showToast('Entry updated ✓', 'success');
    });

    // --- Add Entry ---
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const timeValue = timeInput.value;
        const amountValue = parseInt(amountInput.value, 10);

        if (!timeValue || isNaN(amountValue) || amountValue <= 0) {
            showToast('Please enter valid time and amount', 'error');
            return;
        }

        const hours = parseInt(timeValue.split(':')[0], 10);
        const minutes = parseInt(timeValue.split(':')[1], 10);
        const entryTime = new Date();

        if (selectedDate !== getTodayString()) {
            const selectedDateObj = new Date(selectedDate + 'T00:00:00');
            entryTime.setTime(selectedDateObj.getTime());
        }

        entryTime.setHours(hours, minutes, 0, 0);

        caffeineEntries.push({
            time: entryTime.toISOString(),
            amount: amountValue
        });

        caffeineEntries.sort(function (a, b) { return new Date(a.time) - new Date(b.time); });

        saveToStorage(STORAGE_KEYS.ENTRIES, caffeineEntries);
        form.reset();
        setTimeToNow(timeInput);
        drinkButtons.forEach(function (b) { b.classList.remove('active'); });
        displayEntries();
        updateChart();
        updateHeroStat();
        showToast('Entry added ✓', 'success');
    });

    // --- Clear Entries (with undo) ---
    function clearAllEntries() {
        const dayEntries = getDateEntries(caffeineEntries, selectedDate);

        // Store for undo
        lastDeleted = {
            type: 'all',
            entries: dayEntries.map(function (e) { return Object.assign({}, e); }),
        };

        // Remove day entries
        caffeineEntries = caffeineEntries.filter(function (entry) {
            const entryDate = new Date(entry.time);
            return entryDate.toISOString().split('T')[0] !== selectedDate;
        });

        saveToStorage(STORAGE_KEYS.ENTRIES, caffeineEntries);
        displayEntries();
        updateChart();
        updateHeroStat();

        showSnackbar('All entries cleared', 'Undo', function () {
            caffeineEntries = caffeineEntries.concat(lastDeleted.entries);
            saveToStorage(STORAGE_KEYS.ENTRIES, caffeineEntries);
            displayEntries();
            updateChart();
            updateHeroStat();
            showToast('Entries restored', 'info');
            lastDeleted = null;
        });
    }

    clearEntriesButton.addEventListener('click', clearAllEntries);

    // --- Delete Entry (with undo) ---
    function deleteEntry(index) {
        const entry = caffeineEntries[index];

        // Store for undo
        lastDeleted = {
            type: 'single',
            entry: Object.assign({}, entry),
            index: index,
        };

        caffeineEntries.splice(index, 1);
        saveToStorage(STORAGE_KEYS.ENTRIES, caffeineEntries);
        editFormElement.style.display = 'none';
        displayEntries();
        updateChart();
        updateHeroStat();

        showSnackbar('Entry deleted', 'Undo', function () {
            caffeineEntries.splice(lastDeleted.index, 0, lastDeleted.entry);
            caffeineEntries.sort(function (a, b) { return new Date(a.time) - new Date(b.time); });
            saveToStorage(STORAGE_KEYS.ENTRIES, caffeineEntries);
            displayEntries();
            updateChart();
            updateHeroStat();
            showToast('Entry restored', 'info');
            lastDeleted = null;
        });
    }

    deleteEntryButton.addEventListener('click', function () {
        const index = parseInt(editIndexInput.value, 10);
        deleteEntry(index);
    });

    // --- Boot ---
    initChart();
    displayEntries();
    updateChart();
    startHeroTimer();
});
