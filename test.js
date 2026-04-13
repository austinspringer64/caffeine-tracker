// test.js - Unit tests for caffeine tracker logic
// Run with: node test.js

const CAFFEINE_HALF_LIFE = 5; // hours (must match app.js)
const MS_PER_HOUR = 1000 * 60 * 60;

// Replicate the core function for testing
function calculateCaffeineLevel(entryTime, entryAmount, targetTime) {
    const timeDiff = (targetTime - entryTime) / MS_PER_HOUR;
    if (timeDiff < 0) return 0;
    return entryAmount * Math.pow(0.5, timeDiff / CAFFEINE_HALF_LIFE);
}

// Test runner
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  PASS: ${message}`);
    } else {
        failed++;
        console.error(`  FAIL: ${message}`);
    }
}

function assertClose(actual, expected, tolerance = 0.01, message = '') {
    const diff = Math.abs(actual - expected);
    assert(diff < tolerance, `${message} (expected ${expected}, got ${actual.toFixed(4)})`);
}

// Tests
console.log('\n--- calculateCaffeineLevel Tests ---\n');

// Test 1: No time elapsed — should return full amount
{
    const now = new Date();
    const result = calculateCaffeineLevel(now, 100, now);
    assertClose(result, 100, 0.01, 'Full amount at zero elapsed time');
}

// Test 2: Exactly one half-life — should return half
{
    const entryTime = new Date();
    const targetTime = new Date(entryTime.getTime() + CAFFEINE_HALF_LIFE * MS_PER_HOUR);
    const result = calculateCaffeineLevel(entryTime, 100, targetTime);
    assertClose(result, 50, 0.01, 'Half after one half-life');
}

// Test 3: Two half-lives — should return quarter
{
    const entryTime = new Date();
    const targetTime = new Date(entryTime.getTime() + 2 * CAFFEINE_HALF_LIFE * MS_PER_HOUR);
    const result = calculateCaffeineLevel(entryTime, 100, targetTime);
    assertClose(result, 25, 0.01, 'Quarter after two half-lives');
}

// Test 4: Target before entry — should return 0
{
    const entryTime = new Date();
    const targetTime = new Date(entryTime.getTime() - MS_PER_HOUR);
    const result = calculateCaffeineLevel(entryTime, 100, targetTime);
    assert(result === 0, 'Zero when target is before entry');
}

// Test 5: Zero amount — should return 0
{
    const now = new Date();
    const result = calculateCaffeineLevel(now, 0, now);
    assert(result === 0, 'Zero amount returns zero');
}

// Test 6: After 1 hour (approximate)
{
    const entryTime = new Date();
    const targetTime = new Date(entryTime.getTime() + MS_PER_HOUR);
    const result = calculateCaffeineLevel(entryTime, 100, targetTime);
    const expected = 100 * Math.pow(0.5, 1 / CAFFEINE_HALF_LIFE);
    assertClose(result, expected, 0.01, 'Correct decay after 1 hour');
}

// Test 7: Large amount, 5 hours
{
    const entryTime = new Date();
    const targetTime = new Date(entryTime.getTime() + 5 * CAFFEINE_HALF_LIFE * MS_PER_HOUR);
    const result = calculateCaffeineLevel(entryTime, 400, targetTime);
    assertClose(result, 12.5, 0.01, '400mg after 5 half-lives = 12.5mg');
}

// Summary
console.log('\n--- Test Summary ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
    console.error('\nSome tests failed!');
    process.exit(1);
} else {
    console.log('\nAll tests passed!');
    process.exit(0);
}
