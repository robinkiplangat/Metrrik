/**
 * Q-Sci Developer Mode Helper
 * 
 * This script helps you enable/disable developer mode for testing
 * Run this in your browser's console or save as a bookmark
 */

// Enable Developer Mode
function enableDeveloperMode() {
  localStorage.setItem('qsci_developer_mode', 'true');
  console.log('✅ Developer mode enabled! You can now run unlimited free analyses.');
  console.log('🔄 Refresh the page to see the changes.');
  return true;
}

// Disable Developer Mode
function disableDeveloperMode() {
  localStorage.removeItem('qsci_developer_mode');
  console.log('❌ Developer mode disabled. Free analysis limit restored.');
  console.log('🔄 Refresh the page to see the changes.');
  return false;
}

// Check Developer Mode Status
function checkDeveloperMode() {
  const isEnabled = localStorage.getItem('qsci_developer_mode') === 'true';
  console.log(`Developer mode is: ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  return isEnabled;
}

// Reset Free Analysis Counter
function resetFreeAnalysis() {
  localStorage.removeItem('qsci_free_analysis_used');
  console.log('🔄 Free analysis counter reset. You can now use your free analysis again.');
  return true;
}

// Show All Q-Sci Local Storage
function showQSciStorage() {
  console.log('📊 Q-Sci Local Storage:');
  console.log('========================');
  
  const keys = Object.keys(localStorage).filter(key => key.startsWith('qsci_'));
  
  if (keys.length === 0) {
    console.log('No Q-Sci data found in localStorage');
    return;
  }
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`${key}: ${value}`);
  });
}

// Clear All Q-Sci Data
function clearQSciData() {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('qsci_'));
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ Cleared ${keys.length} Q-Sci localStorage entries`);
  return keys.length;
}

// Auto-run on load
console.log(`
🚀 Q-Sci Developer Mode Helper Loaded!

Available commands:
• enableDeveloperMode()  - Enable unlimited free analyses
• disableDeveloperMode() - Disable developer mode
• checkDeveloperMode()   - Check current status
• resetFreeAnalysis()    - Reset free analysis counter
• showQSciStorage()      - Show all Q-Sci localStorage data
• clearQSciData()        - Clear all Q-Sci data

Quick start: enableDeveloperMode()
`);

// Export functions to global scope
window.enableDeveloperMode = enableDeveloperMode;
window.disableDeveloperMode = disableDeveloperMode;
window.checkDeveloperMode = checkDeveloperMode;
window.resetFreeAnalysis = resetFreeAnalysis;
window.showQSciStorage = showQSciStorage;
window.clearQSciData = clearQSciData;
