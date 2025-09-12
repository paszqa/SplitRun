(function() {
  // Wait for Tauri to be ready if running in Tauri context
  function waitForTauri() {
    return new Promise((resolve) => {
      // Check if we're in a Tauri environment
      if (window.__TAURI_INTERNALS__) {
        console.log('Tauri internals detected, setting up APIs manually...');
        // Manually set up the invoke function for Tauri v2
        window.__TAURI__ = {
          core: {
            invoke: window.__TAURI_INTERNALS__.invoke
          }
        };
        console.log('Tauri APIs manually initialized');
        resolve();
        return;
      }
      
      if (window.__TAURI__) {
        console.log('Tauri already available');
        resolve();
        return;
      }
      
      // Fallback timeout
      console.log('No Tauri detected, using fallback timeout');
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  // Initialize the app after Tauri is ready (or timeout)
  waitForTauri().then(() => {
    initApp();
  });

  function initApp() {
  console.log('initApp starting...');
  let runTitle = 'Run Title';
  let iconPath = ''; // Path to the run icon
  let runsStarted = 0; // Number of runs started (reset and save)
  let runsCompleted = 0; // Number of runs completed (reached the end)
  let splitNames = ['Split 1', 'Split 2', 'Split 3'];
  let splitIcons = ['', '', '']; // Icons for each split (empty = default icon)
  let backgroundColor = '#0e0f13'; // Background color for the app
  let runTitleColor = '#c9d1d9';
  let splitTableColor = '#c9d1d9';
  let totalTimerTextColor = '#8b9bb4';
  let totalTimerDigitsColor = '#c9d1d9';
  let sumBestSegmentsColor = '#c9d1d9';
  let bestCompleteRunColor = '#c9d1d9';
  let splitBg1Color = '#0000000a';
  let splitBg2Color = '#00000015';
  
  // Welcome screen state
  let isWelcomeScreen = true;
  
  // Global file browser state
  let fpCurrentPath = null; // Current path for save file browser
  let imgCurrentPath = null; // Current path for image browser
  // Persistence (localStorage) keys
  const STORAGE_KEY = 'speedrun_splitter_state_v1';
  const SAVE_PATH_KEY = 'speedrun_splitter_save_path_v1';
  const GLOBAL_SETTINGS_KEY = 'speedrun_splitter_global_v1';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }
  
  // Load saved state on app startup
  const savedState = loadState();
  if (savedState) {
    runTitle = savedState.runTitle || runTitle;
    iconPath = savedState.iconPath || iconPath;
    splitNames = savedState.splitNames || splitNames;
    splitIcons = savedState.splitIcons || splitIcons;
    runsStarted = savedState.runsStarted || runsStarted;
    runsCompleted = savedState.runsCompleted || runsCompleted;
    
    // Load column visibility settings
    if (typeof savedState.showSumBest === 'boolean') {
      // Will be applied when DOM is ready via updateColumnVisibilityFromState()
    }
    if (typeof savedState.showBestComplete === 'boolean') {
      // Will be applied when DOM is ready via updateColumnVisibilityFromState()
    }
    
    console.log('Loaded state from localStorage:', savedState);
    console.log('Loaded splitIcons:', splitIcons);
  }
  
  // Apply default background color on startup (will be overridden when save file is loaded)
  document.documentElement.style.setProperty('--bg', backgroundColor);
  document.documentElement.style.setProperty('--run-title-color', runTitleColor);
  document.documentElement.style.setProperty('--split-table-color', splitTableColor);
  document.documentElement.style.setProperty('--total-timer-text-color', totalTimerTextColor);
  document.documentElement.style.setProperty('--total-timer-digits-color', totalTimerDigitsColor);
  document.documentElement.style.setProperty('--sum-best-segments-color', sumBestSegmentsColor);
  document.documentElement.style.setProperty('--best-complete-run-color', bestCompleteRunColor);
  document.documentElement.style.setProperty('--split-bg-1', splitBg1Color);
  document.documentElement.style.setProperty('--split-bg-2', splitBg2Color);
  function updateColumnVisibilityFromState() {
    const savedState = loadState();
    if (savedState) {
      // Apply column visibility from saved state
      if (typeof savedState.showSumBest === 'boolean') {
        const checkbox = document.getElementById('show-sum-best');
        if (checkbox) checkbox.checked = savedState.showSumBest;
        const sumBestRow = document.querySelector('tr[data-row="sum-best"]');
        if (sumBestRow) {
          sumBestRow.style.display = savedState.showSumBest ? '' : 'none';
        }
      }
      if (typeof savedState.showBestComplete === 'boolean') {
        const checkbox = document.getElementById('show-best-complete');
        if (checkbox) checkbox.checked = savedState.showBestComplete;
        const bestCompleteRow = document.querySelector('tr[data-row="best-complete"]');
        if (bestCompleteRow) {
          bestCompleteRow.style.display = savedState.showBestComplete ? '' : 'none';
        }
      }
    }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }
  
  function loadGlobalSettings() {
    try { 
      const raw = localStorage.getItem(GLOBAL_SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {}; 
    } catch { 
      return {}; 
    }
  }
  function saveGlobalSettings(settings) {
    try { localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings)); } catch {}
  }
  
  function addRecentFile(filePath) {
    if (!filePath) return;
    
    const globalSettings = loadGlobalSettings();
    let recentFiles = globalSettings.recentFiles || [];
    
    // Remove if already exists
    recentFiles = recentFiles.filter(f => f !== filePath);
    // Add to beginning
    recentFiles.unshift(filePath);
    // Keep only first 5
    recentFiles = recentFiles.slice(0, 5);
    
    globalSettings.recentFiles = recentFiles;
    saveGlobalSettings(globalSettings);
  }

  // Welcome Screen Functions
  function showWelcomeScreen() {
    console.log('Showing welcome screen');
    isWelcomeScreen = true;
    const main = document.querySelector('main');
    
    main.innerHTML = `
      <div class="welcome-screen">
        <div class="welcome-content">
          <div class="welcome-logo">
            <div class="logo-icon">
              <img src="logo1.png" alt="SplitRun" width="300" height="80">
            </div>
          </div>
          
          <div class="welcome-menu">
            <div class="menu-section">
              <button class="menu-button primary" id="welcome-new">
                📄 New Split File...
              </button>
              <button class="menu-button primary" id="welcome-open">
                📂 Open Split File...
              </button>
            </div>
            
            <div class="menu-section recent-section" id="recent-section" style="display: none;">
              <h3>Recent Files</h3>
              <div class="recent-files-list" id="recent-files-list">
                <!-- Recent files will be populated here -->
              </div>
            </div>
            
            <div class="menu-section">
              <button class="menu-button secondary" id="welcome-exit">
                ❌ Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Populate recent files
    updateRecentFilesList();
    
    // Setup event listeners
    document.getElementById('welcome-new').addEventListener('click', () => {
      console.log('New file clicked');
      createNewSplitFile();
    });
    
    document.getElementById('welcome-open').addEventListener('click', () => {
      console.log('Open file clicked');
      openSplitFile();
    });
    
    document.getElementById('welcome-exit').addEventListener('click', () => {
      console.log('Exit clicked');
      exitApplication();
    });
  }
  
  function updateRecentFilesList() {
    const globalSettings = loadGlobalSettings();
    const recentFiles = globalSettings.recentFiles || [];
    const recentSection = document.getElementById('recent-section');
    const recentFilesList = document.getElementById('recent-files-list');
    
    if (recentFiles.length > 0) {
      recentSection.style.display = 'block';
      recentFilesList.innerHTML = '';
      
      recentFiles.forEach((filePath, index) => {
        const fileName = filePath.split('/').pop() || filePath;
        const button = document.createElement('button');
        button.className = 'menu-button recent';
        button.innerHTML = `📄 ${fileName}`;
        button.title = filePath;
        button.addEventListener('click', () => {
          console.log('Recent file clicked:', filePath);
          loadSplitFileFromPath(filePath);
        });
        recentFilesList.appendChild(button);
      });
    } else {
      recentSection.style.display = 'none';
    }
  }
  
  function hideWelcomeScreen() {
    console.log('Hiding welcome screen');
    isWelcomeScreen = false;
    const main = document.querySelector('main');
    
    // Restore original content
    main.innerHTML = `
      <!-- Run Header (separate from table) -->
      <div class="run-header">
        <div class="run-icon">🏁</div>
        <div class="run-title" id="run-title">Run Title</div>
        <div class="run-stats" id="run-stats">0/0</div>
      </div>
      
      <table class="splits-table">
        <thead>
          <tr class="columns">
          <th>Split</th>
          <th title="Total Time">T<sub>T</sub></th>
          <th title="This Segment">SEG</th>
          <th title="Diff vs Best Total">Diff<sub>T</sub></th>
          <th title="Diff vs Best This Segment">Diff<sub>SEG</sub></th>
          <th title="Diff vs Best Complete Run">Diff<sub>BCR</sub></th>
          <th title="Best Total">Best<sub>T</sub></th>
          <th title="Best This Segment">Best<sub>SEG</sub></th>
          <th title="Best Complete Run">BCR</th>
          </tr>
        </thead>
        <tbody id="splits-body">
          <!-- rows injected by main.js -->
        </tbody>
      </table>
      
      <!-- Summary Statistics Table -->
      <table class="summary-table">
        <tbody><tr>
        <td id="total-timer" class="summary-value">00:00.000</td>
        </tr></tbody>
      </table>
      <table class="summary-table">
        <tbody>
          <tr>
            <td class="summary-label">Best Complete Run:</td>
            <td id="best-complete" class="summary-value">—</td>
          </tr>
          <tr>
            <td class="summary-label">Sum of Best Segments:</td>
            <td id="sum-best-segments" class="summary-value">—</td>
          </tr>
        </tbody>
      </table>
    `;
    
    // Re-initialize the splits interface
    renderRows();
    updateColumnVisibilityFromState(); // Apply saved column visibility settings
    updateRunStats(); // Update the run statistics display
    setActiveRow(-1);
    buildContextMenu();
  }
  
  function createNewSplitFile() {
    // First ask for save location, then open config
    showSaveLocationPicker();
  }
  
  // File browser for choosing save location for new files
  async function showSaveLocationPicker() {
    const modal = document.createElement('div');
    modal.className = 'file-browser-modal';
    modal.innerHTML = `
      <div class="file-browser-content">
        <div class="file-browser-header">
          <h3>Choose Save Location for New Split File</h3>
          <button class="close-btn" onclick="this.closest('.file-browser-modal').remove()">×</button>
        </div>
        <div class="file-browser-path">
          <button id="fbHomeSave">🏠</button>
          <button id="fbUpSave">⬆️</button>
          <span id="fbPathSave">/</span>
        </div>
        <div class="file-browser-list" id="fbListSave">
          Loading...
        </div>
        <div class="file-browser-input">
          <input type="text" id="fbFilenameSave" placeholder="my-splits.json" value="my-splits.json">
          <button id="fbCreateFile">Create</button>
          <button id="fbCancelSave">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentPath = '/';
    
    // Initialize with home directory
    try {
      currentPath = await window.__TAURI__.core.invoke('home_dir');
    } catch (error) {
      console.error('Failed to get home directory:', error);
      currentPath = '/';
    }
    
    // Load directory function
    async function loadDir(path) {
      try {
        const result = await window.__TAURI__.core.invoke('list_dir', { path });
        const listEl = document.getElementById('fbListSave');
        const pathEl = document.getElementById('fbPathSave');
        
        pathEl.textContent = path;
        currentPath = path;
        
        listEl.innerHTML = '';
        
        // Sort: directories first, then files
        result.sort((a, b) => {
          if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        
        result.forEach(item => {
          const el = document.createElement('div');
          el.className = 'file-browser-item';
          el.innerHTML = `${item.is_dir ? '📁' : '📄'} ${item.name}`;
          el.onclick = () => {
            if (item.is_dir) {
              const newPath = path.endsWith('/') ? path + item.name : path + '/' + item.name;
              loadDir(newPath);
            } else if (item.name.endsWith('.json')) {
              // If user clicks on a JSON file, pre-fill the filename
              document.getElementById('fbFilenameSave').value = item.name;
            }
          };
          listEl.appendChild(el);
        });
      } catch (error) {
        console.error('Failed to read directory:', error);
        document.getElementById('fbListSave').innerHTML = 'Failed to load directory';
      }
    }
    
    // Event handlers
    document.getElementById('fbHomeSave').onclick = async () => {
      try {
        const homeDir = await window.__TAURI__.core.invoke('home_dir');
        loadDir(homeDir);
      } catch (error) {
        loadDir('/');
      }
    };
    
    document.getElementById('fbUpSave').onclick = () => {
      const parts = currentPath.split('/').filter(p => p);
      if (parts.length > 0) {
        parts.pop();
        loadDir('/' + parts.join('/'));
      }
    };
    
    document.getElementById('fbCreateFile').onclick = () => {
      const filename = document.getElementById('fbFilenameSave').value.trim();
      if (filename) {
        const fullPath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
        console.log('Creating new split file at:', fullPath);
        
        // Save the path and proceed with file creation
        saveSavePath(fullPath);
        addRecentFile(fullPath);
        
        // Reset to default state
        runTitle = 'New Run';
        iconPath = '';
        splitNames = ['Split 1', 'Split 2', 'Split 3'];
        resetRun();
        
        modal.remove();
        hideWelcomeScreen();
        
        // Open configuration modal to set up the new file
        openConfig();
      }
    };
    
    document.getElementById('fbCancelSave').onclick = () => {
      modal.remove();
    };
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
    
    // Load initial directory
    loadDir(currentPath);
  }
  
  function openSplitFile() {
    // Use Tauri file dialog to open file
    if (window.__TAURI__?.dialog?.open) {
      window.__TAURI__.dialog.open({
        multiple: false,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      }).then(filePath => {
        if (filePath) {
          console.log('File selected:', filePath);
          loadSplitFileFromPath(filePath);
        }
      }).catch(error => {
        console.error('File dialog error:', error);
      });
    } else {
      // Fallback - use custom file browser
      showFileBrowserForOpen();
    }
  }
  
  function loadSplitFileFromPath(filePath) {
    if (!filePath) return Promise.reject(new Error('No file path provided'));
    
    return loadSaveFile(filePath).then(() => {
      addRecentFile(filePath);
      hideWelcomeScreen();
    }).catch(error => {
      console.error('Failed to load file:', error);
      throw error;
    });
  }
  
  function exitApplication() {
    if (window.__TAURI__?.process) {
      // Close Tauri application
      window.__TAURI__.process.exit(0);
    } else {
      // Fallback for browser
      window.close();
    }
  }

  function addRecentFile(filePath) {
    if (!filePath) return;
    
    const globalSettings = loadGlobalSettings();
    let recentFiles = globalSettings.recentFiles || [];
    
    // Remove if already exists (to move to front)
    recentFiles = recentFiles.filter(path => path !== filePath);
    
    // Add to front
    recentFiles.unshift(filePath);
    
    // Keep only 5 most recent
    recentFiles = recentFiles.slice(0, 5);
    
    globalSettings.recentFiles = recentFiles;
    saveGlobalSettings(globalSettings);
  }
  
  function getRecentFiles() {
    const globalSettings = loadGlobalSettings();
    return globalSettings.recentFiles || [];
  }
  
  function getColumnVisibility() {
    const globalSettings = loadGlobalSettings();
    return globalSettings.columnVisibility || {
      split: true,
      total: true,
      segment: true,
      diff: true,
      bestTotal: true,
      bestSegment: true,
      bestComplete: true
    };
  }
  
  function getColumnWidths() {
    const state = loadState();
    return state?.columnWidths || {
      split: 150,
      total: 100,
      segment: 100,
      diff: 80,
      bestTotal: 100,
      bestSegment: 100,
      bestComplete: 100
    };
  }
  
  function getDisplaySettings() {
    const globalSettings = loadGlobalSettings();
    let settings = globalSettings.displaySettings || {
      rowHeightPreset: 'normal',
      rowHeight: 36,
      paddingTop: 8,
      paddingBottom: 8,
      splitTableFontSize: 14,
      totalTimerFontSize: 24,
      totalTimerBold: false,
      summaryFontSize: 16,
      globalFontFamily: 'system-ui',
      showSumBest: true,
      showBestComplete: true
    };
    
    // Clean up any color properties that shouldn't be in displaySettings
    const cleanSettings = {
      rowHeightPreset: settings.rowHeightPreset || 'normal',
      rowHeight: settings.rowHeight || 36,
      paddingTop: settings.paddingTop ?? 8,
      paddingBottom: settings.paddingBottom ?? 8,
      splitTableFontSize: settings.splitTableFontSize || 14,
      totalTimerFontSize: settings.totalTimerFontSize || 24,
      totalTimerBold: settings.totalTimerBold || false,
      summaryFontSize: settings.summaryFontSize || 16,
      globalFontFamily: settings.globalFontFamily || 'system-ui',
      showSumBest: settings.showSumBest ?? true,
      showBestComplete: settings.showBestComplete ?? true
    };
    
    // If we cleaned anything, save the clean version back to localStorage
    if (JSON.stringify(settings) !== JSON.stringify(cleanSettings)) {
      console.log('Cleaning up displaySettings, removing color properties');
      const globalSettings = loadGlobalSettings();
      globalSettings.displaySettings = cleanSettings;
      saveGlobalSettings(globalSettings);
    }
    
    console.log('getDisplaySettings returning:', cleanSettings);
    return cleanSettings;
  }
  
  // Hotkey management functions
  function getHotkeySettings() {
    const globalSettings = loadGlobalSettings();
    return globalSettings.hotkeys || {
      'start-split': 'Backspace',
      'stop': null,
      'reset-save': null,
      'reset-no-save': null
    };
  }
  
  function saveHotkeySettings(hotkeys) {
    const globalSettings = loadGlobalSettings();
    globalSettings.hotkeys = hotkeys;
    saveGlobalSettings(globalSettings);
  }
  
  // Hotkey input handling
  // Convert JavaScript key names to device_query Keycode format
  function mapJsKeyToRustKey(jsKey) {
    // Letters: JavaScript gives lowercase, Rust expects uppercase
    if (jsKey.length === 1 && jsKey >= 'a' && jsKey <= 'z') {
      return jsKey.toUpperCase();
    }
    
    // Numbers: JavaScript gives "1", "2", etc., Rust expects "Key1", "Key2", etc.
    if (jsKey >= '0' && jsKey <= '9') {
      return `Key${jsKey}`;
    }
    
    // Special keys mapping
    const keyMap = {
      ' ': 'Space',
      'Enter': 'Return',
      'Backspace': 'Backspace',
      'Tab': 'Tab',
      'Escape': 'Escape',
      'Delete': 'Delete',
      'Insert': 'Insert',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
      'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
      'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
      'Shift': 'LShift',
      'Control': 'LControl',
      'Alt': 'LAlt',
      'Meta': 'LMeta'
    };
    
    return keyMap[jsKey] || jsKey;
  }

  function setupHotkeyInputs() {
    const hotkeyInputs = ['start-split', 'stop', 'reset-save', 'reset-no-save', 'unsplit'];
    
    hotkeyInputs.forEach(action => {
      const input = document.getElementById(`hotkey-input-${action}`);
      if (input) {
        // Handle focus to start listening
        input.addEventListener('focus', () => {
          input.value = 'Press a key...';
          input.style.borderColor = '#4a90e2';
        });
        
        // Handle blur to stop listening
        input.addEventListener('blur', () => {
          if (input.value === 'Press a key...') {
            input.value = '';
          }
          input.style.borderColor = '#2a2d37';
        });
        
        // Handle key press
        input.addEventListener('keydown', (e) => {
          e.preventDefault();
          
          // If Escape is pressed, clear the hotkey
          if (e.key === 'Escape') {
            clearHotkey(action);
            input.blur();
            return;
          }
          
          // Don't allow certain keys
          const forbiddenKeys = ['Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta'];
          if (forbiddenKeys.includes(e.key)) {
            return;
          }
          
          // Set the new hotkey
          const mappedKey = mapJsKeyToRustKey(e.key);
          setHotkey(action, e.key, mappedKey);
          input.blur();
        });
      }
    });
  }
  
  function setHotkey(action, displayKey, mappedKey) {
    const hotkeys = getHotkeySettings();
    
    // Check if this mapped key is already assigned to another action
    for (const [existingAction, existingMappedKey] of Object.entries(hotkeys)) {
      if (existingMappedKey === mappedKey && existingAction !== action) {
        if (!confirm(`"${displayKey}" is already assigned to "${getActionDisplayName(existingAction)}". Do you want to reassign it to "${getActionDisplayName(action)}"?`)) {
          return;
        }
        // Clear the existing assignment
        hotkeys[existingAction] = null;
        updateHotkeyDisplay(existingAction);
      }
    }
    
    // Set the new hotkey (store mapped key for comparison, but we'll display the original)
    hotkeys[action] = mappedKey;
    saveHotkeySettings(hotkeys);
    updateHotkeyDisplay(action, displayKey);
    
    console.log(`Hotkey set: ${action} -> "${displayKey}" (mapped to "${mappedKey}")`);
    
    console.log(`Hotkey for ${action} set to: ${key}`);
  }
  
  function clearHotkey(action) {
    const hotkeys = getHotkeySettings();
    hotkeys[action] = null;
    saveHotkeySettings(hotkeys);
    updateHotkeyDisplay(action);
    
    console.log(`Hotkey for ${action} cleared`);
  }
  
  // Convert device_query Keycode format back to JavaScript key names for display
  function mapRustKeyToJsKey(rustKey) {
    // Letters: Rust gives uppercase, JavaScript expects lowercase for display
    if (rustKey && rustKey.length === 1 && rustKey >= 'A' && rustKey <= 'Z') {
      return rustKey.toLowerCase();
    }
    
    // Numbers: Rust gives "Key1", "Key2", etc., JavaScript expects "1", "2", etc.
    if (rustKey && rustKey.startsWith('Key') && rustKey.length === 4) {
      const digit = rustKey[3];
      if (digit >= '0' && digit <= '9') {
        return digit;
      }
    }
    
    // Special keys reverse mapping
    const keyMap = {
      'Space': ' ',
      'Return': 'Enter',
      'Backspace': 'Backspace',
      'Tab': 'Tab',
      'Escape': 'Escape',
      'Delete': 'Delete',
      'Insert': 'Insert',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
      'Up': 'ArrowUp',
      'Down': 'ArrowDown',
      'Left': 'ArrowLeft',
      'Right': 'ArrowRight',
      'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
      'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
      'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
      'LShift': 'Shift',
      'LControl': 'Control',
      'LAlt': 'Alt',
      'LMeta': 'Meta'
    };
    
    return keyMap[rustKey] || rustKey;
  }

  function updateHotkeyDisplay(action, displayKey = null) {
    const hotkeys = getHotkeySettings();
    const display = document.getElementById(`hotkey-display-${action}`);
    const input = document.getElementById(`hotkey-input-${action}`);
    
    if (display) {
      if (displayKey) {
        // Use provided display key
        display.textContent = displayKey;
      } else {
        // Convert stored mapped key back to display format
        const mappedKey = hotkeys[action];
        const displayText = mappedKey ? mapRustKeyToJsKey(mappedKey) : 'Not Set';
        display.textContent = displayText;
      }
    }
    if (input) {
      input.value = '';
    }
  }
  
  function getActionDisplayName(action) {
    const names = {
      'start-split': 'Start/Split',
      'stop': 'Stop',
      'reset-save': 'Reset + Save',
      'reset-no-save': 'Reset + Don\'t Save',
      'unsplit': 'Unsplit'
    };
    return names[action] || action;
  }
  
  // Global function to make clearHotkey available in HTML onclick
  window.clearHotkey = clearHotkey;
  
  function saveColumnVisibility(visibility) {
    const globalSettings = loadGlobalSettings();
    globalSettings.columnVisibility = visibility;
    saveGlobalSettings(globalSettings);
  }
  
  function saveColumnWidths(widths) {
    const state = loadState() || {};
    state.columnWidths = widths;
    saveState(state);
  }
  
  function saveDisplaySettings(settings) {
    console.log('=== SAVE DISPLAY SETTINGS DEBUG ===');
    console.log('Settings object received:', settings);
    console.log('Settings globalFontFamily:', settings.globalFontFamily);
    const globalSettings = loadGlobalSettings();
    globalSettings.displaySettings = settings;
    console.log('Global settings before save:', globalSettings);
    saveGlobalSettings(globalSettings);
    console.log('Saved to localStorage');
  }

  function updateColumnStyles(visibility, widths) {
    // Provide defaults if parameters are undefined
    if (!visibility) {
      visibility = getColumnVisibility();
    }
    if (!widths) {
      widths = getColumnWidths();
    }
    
    // Remove existing dynamic column styles
    let styleEl = document.getElementById('dynamic-column-styles');
    if (styleEl) {
      styleEl.remove();
    }

    // Create new style element
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-column-styles';
    
    const columnMap = {
      split: 0,
      total: 1,
      segment: 2,
      diff: 3,
      diffSegment: 4,
      diffComplete: 5,
      bestTotal: 6,
      bestSegment: 7,
      bestComplete: 8
    };

    let cssRules = '';
    let totalWidth = 0;
    
    Object.entries(columnMap).forEach(([colId, index]) => {
      const nthChild = index + 1;
      
      if (!visibility[colId]) {
        cssRules += `.splits-table th:nth-child(${nthChild}), .splits-table td:nth-child(${nthChild}) { display: none; }\n`;
      } else if (widths[colId]) {
        const width = widths[colId];
        totalWidth += width + 20; // Add padding (8px * 2 + 4px border/spacing)
        
        cssRules += `.splits-table th:nth-child(${nthChild}), .splits-table td:nth-child(${nthChild}) {
          width: ${width}px !important;
          min-width: ${width}px !important;
          max-width: ${width}px !important;
        }\n`;
      }
    });

    // Set table width to sum of column widths
    if (totalWidth > 0) {
      cssRules += `.splits-table { width: ${totalWidth}px !important; }\n`;
      cssRules += `.run-header { width: ${totalWidth}px !important; }\n`;
      cssRules += `.summary-table { width: ${totalWidth}px !important; }\n`;
    }

    styleEl.textContent = cssRules;
    document.head.appendChild(styleEl);
  }
  
  function updateColumnVisibility() {
    const visibility = getColumnVisibility();
    const widths = getColumnWidths();
    updateColumnStyles(visibility, widths);
    const table = document.querySelector('.splits-table');
    if (!table) return;

    // Map column IDs to column indices (0-based)
    const columnMap = {
      split: 0,
      total: 1,
      segment: 2,
      diff: 3,
      diffSegment: 4,
      diffComplete: 5,
      bestTotal: 6,
      bestSegment: 7,
      bestComplete: 8
    };

    // Update header columns
    const headerRow = table.querySelector('thead .columns');
    if (headerRow) {
      Object.entries(columnMap).forEach(([colId, index]) => {
        const th = headerRow.children[index];
        if (th) {
          th.classList.toggle('col-hidden', !visibility[colId]);
        }
      });
    }

    // Update data rows
    const rows = table.querySelectorAll('tbody .row');
    rows.forEach(row => {
      Object.entries(columnMap).forEach(([colId, index]) => {
        const td = row.children[index];
        if (td) {
          td.classList.toggle('col-hidden', !visibility[colId]);
        }
      });
    });
  }
  
  function updateDisplaySettings() {
    const settings = getDisplaySettings();
    const body = document.body;
    const table = document.querySelector('.splits-table');
    
    // Update row height on table
    if (table) {
      // Remove old classes
      table.className = table.className.replace(/row-height-\w+/g, '');
      table.classList.remove('custom-row-height');
      
      if (settings.rowHeightPreset === 'custom') {
        // Apply custom row height
        table.classList.add('custom-row-height');
        table.style.setProperty('--custom-row-height', `${settings.rowHeight}px`);
        table.style.setProperty('--custom-padding-top', `${settings.paddingTop}px`);
        table.style.setProperty('--custom-padding-bottom', `${settings.paddingBottom}px`);
      } else {
        // Apply preset row height
        table.classList.add(`row-height-${settings.rowHeightPreset}`);
        // Clear custom properties
        table.style.removeProperty('--custom-row-height');
        table.style.removeProperty('--custom-padding-top');
        table.style.removeProperty('--custom-padding-bottom');
        table.style.removeProperty('--custom-margin-top');
        table.style.removeProperty('--custom-margin-bottom');
      }
      
      // Apply split table font size
      table.style.setProperty('--split-table-font-size', `${settings.splitTableFontSize}px`);
    }
    
    // Apply font sizes to total timer and summary using direct styles
    const totalEl = document.getElementById('total-timer');
    if (totalEl) {
      totalEl.style.fontSize = `${settings.totalTimerFontSize}px`;
      totalEl.style.color = `var(--total-timer-digits-color)`;
      totalEl.style.fontWeight = settings.totalTimerBold ? 'bold' : 'normal';
    }
    
    // Apply global font family
    if (settings.globalFontFamily) {
      let fontStack = '';
      switch (settings.globalFontFamily) {
        case 'system-ui':
          fontStack = 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, "Helvetica Neue", Arial';
          break;
        case 'Courier New':
          fontStack = `${settings.globalFontFamily}, "Courier New", Monaco, Consolas, monospace`;
          break;
        case 'Georgia':
          fontStack = `${settings.globalFontFamily}, Georgia, "Times New Roman", serif`;
          break;
        default:
          fontStack = `${settings.globalFontFamily}, sans-serif`;
      }
      // Use setProperty with important to override CSS
      document.documentElement.style.setProperty('font-family', fontStack, 'important');
      document.body.style.setProperty('font-family', fontStack, 'important');
      console.log('Applied global font:', settings.globalFontFamily, 'with stack:', fontStack);
    }
    
    const summaryValues = document.querySelectorAll('.summary-value');
    summaryValues.forEach(el => {
      // Skip the total timer element as it has its own font size setting
      if (el.id !== 'total-timer') {
        el.style.fontSize = `${settings.summaryFontSize}px`;
      }
    });
    
    // Ensure total timer font size is applied correctly after summary values
    if (totalEl) {
      totalEl.style.fontSize = `${settings.totalTimerFontSize}px`;
    }
    
    // Update summary visibility
    const summaryTable = document.querySelector('.summary-table');
    console.log('Summary table found:', !!summaryTable);
    console.log('Settings showSumBest:', settings.showSumBest, 'showBestComplete:', settings.showBestComplete);
    
    if (summaryTable) {
      // Find rows by their value element IDs
      const sumBestElement = document.getElementById('sum-best-segments');
      const bestCompleteElement = document.getElementById('best-complete');
      
      const sumBestRow = sumBestElement?.closest('tr');
      const bestCompleteRow = bestCompleteElement?.closest('tr');
      
      console.log('Sum of Best row found:', !!sumBestRow);
      console.log('Best Complete row found:', !!bestCompleteRow);
      
      if (sumBestRow) {
        sumBestRow.style.display = settings.showSumBest ? '' : 'none';
        console.log('Sum of Best row display set to:', settings.showSumBest ? 'visible' : 'none');
      }
      if (bestCompleteRow) {
        bestCompleteRow.style.display = settings.showBestComplete ? '' : 'none';
        console.log('Best Complete row display set to:', settings.showBestComplete ? 'visible' : 'none');
      }
    }
  }
  
  async function loadSaveFile(filePath) {
    try {
      const content = await fpInvoke('read_text_file', { path: filePath });
      const data = JSON.parse(content);
      
      // Update all configuration from the save file
      if (typeof data.runTitle === 'string') {
        runTitle = data.runTitle;
        if (cfgTitle) cfgTitle.value = runTitle;
        const runTitleElement = document.getElementById('run-title');
        if (runTitleElement) runTitleElement.textContent = runTitle;
      }
      if (typeof data.iconPath === 'string') {
        iconPath = data.iconPath;
        if (cfgIconPath) cfgIconPath.value = iconPath;
        updateIconDisplay();
      }
      if (Array.isArray(data.splitNames) && data.splitNames.length > 0) {
        splitNames = data.splitNames;
        splitIcons = data.splitIcons || new Array(data.splitNames.length).fill('');
        if (cfgCount) {
          console.log('Setting cfgCount from state load (line 721):', splitNames.length);
          cfgCount.value = String(splitNames.length);
        }
        cfgRenderRows(splitNames.length, splitNames);
        // Update arrays to match new split count
        const newLength = splitNames.length;
        bestTotals = (data.bestTotals || []).slice(0, newLength);
        bestSegments = (data.bestSegments || []).slice(0, newLength);
        bestCompleteSplits = (data.bestCompleteSplits || []).slice(0, newLength);
        // Pad with zeros if needed
        while (bestTotals.length < newLength) bestTotals.push(0);
        while (bestSegments.length < newLength) bestSegments.push(0);
        while (bestCompleteSplits.length < newLength) bestCompleteSplits.push(0);
        // Ensure splitIcons array matches
        while (splitIcons.length < newLength) splitIcons.push('');
      }
      
      // Load background color if present
      if (typeof data.backgroundColor === 'string') {
        backgroundColor = data.backgroundColor;
        // Update the configuration form with loaded background color
        if (document.getElementById('background-color-picker')) document.getElementById('background-color-picker').value = backgroundColor;
        if (document.getElementById('background-color-hex')) document.getElementById('background-color-hex').value = backgroundColor;
        // Apply the background color to the app
        document.documentElement.style.setProperty('--bg', backgroundColor);
      }
      
      // Load additional color settings
      if (typeof data.runTitleColor === 'string') {
        runTitleColor = data.runTitleColor;
        if (document.getElementById('run-title-color-picker')) document.getElementById('run-title-color-picker').value = runTitleColor;
        if (document.getElementById('run-title-color-hex')) document.getElementById('run-title-color-hex').value = runTitleColor;
        document.documentElement.style.setProperty('--run-title-color', runTitleColor);
      }
      if (typeof data.splitTableColor === 'string') {
        splitTableColor = data.splitTableColor;
        if (document.getElementById('split-table-color-picker')) document.getElementById('split-table-color-picker').value = splitTableColor;
        if (document.getElementById('split-table-color-hex')) document.getElementById('split-table-color-hex').value = splitTableColor;
        document.documentElement.style.setProperty('--split-table-color', splitTableColor);
      }
      if (typeof data.totalTimerTextColor === 'string') {
        totalTimerTextColor = data.totalTimerTextColor;
        if (document.getElementById('total-timer-text-color-picker')) document.getElementById('total-timer-text-color-picker').value = totalTimerTextColor;
        if (document.getElementById('total-timer-text-color-hex')) document.getElementById('total-timer-text-color-hex').value = totalTimerTextColor;
        document.documentElement.style.setProperty('--total-timer-text-color', totalTimerTextColor);
      }
      if (typeof data.totalTimerDigitsColor === 'string') {
        totalTimerDigitsColor = data.totalTimerDigitsColor;
        if (document.getElementById('total-timer-digits-color-picker')) document.getElementById('total-timer-digits-color-picker').value = totalTimerDigitsColor;
        if (document.getElementById('total-timer-digits-color-hex')) document.getElementById('total-timer-digits-color-hex').value = totalTimerDigitsColor;
        document.documentElement.style.setProperty('--total-timer-digits-color', totalTimerDigitsColor);
      }
      if (typeof data.sumBestSegmentsColor === 'string') {
        sumBestSegmentsColor = data.sumBestSegmentsColor;
        if (document.getElementById('sum-best-segments-color-picker')) document.getElementById('sum-best-segments-color-picker').value = sumBestSegmentsColor;
        if (document.getElementById('sum-best-segments-color-hex')) document.getElementById('sum-best-segments-color-hex').value = sumBestSegmentsColor;
        document.documentElement.style.setProperty('--sum-best-segments-color', sumBestSegmentsColor);
      }
      if (typeof data.bestCompleteRunColor === 'string') {
        bestCompleteRunColor = data.bestCompleteRunColor;
        if (document.getElementById('best-complete-run-color-picker')) document.getElementById('best-complete-run-color-picker').value = bestCompleteRunColor;
        if (document.getElementById('best-complete-run-color-hex')) document.getElementById('best-complete-run-color-hex').value = bestCompleteRunColor;
        document.documentElement.style.setProperty('--best-complete-run-color', bestCompleteRunColor);
      }
      if (typeof data.splitBg1Color === 'string') {
        splitBg1Color = data.splitBg1Color;
        if (document.getElementById('split-bg-1-color-picker')) document.getElementById('split-bg-1-color-picker').value = splitBg1Color;
        if (document.getElementById('split-bg-1-color-hex')) document.getElementById('split-bg-1-color-hex').value = splitBg1Color;
        document.documentElement.style.setProperty('--split-bg-1', splitBg1Color);
      }
      if (typeof data.splitBg2Color === 'string') {
        splitBg2Color = data.splitBg2Color;
        if (document.getElementById('split-bg-2-color-picker')) document.getElementById('split-bg-2-color-picker').value = splitBg2Color;
        if (document.getElementById('split-bg-2-color-hex')) document.getElementById('split-bg-2-color-hex').value = splitBg2Color;
        document.documentElement.style.setProperty('--split-bg-2', splitBg2Color);
      }
      
      // Load column visibility settings if present
      if (typeof data.showSumBest === 'boolean') {
        if (document.getElementById('show-sum-best')) {
          document.getElementById('show-sum-best').checked = data.showSumBest;
        }
        // Update the display immediately
        const sumBestRow = document.querySelector('tr[data-row="sum-best"]');
        if (sumBestRow) {
          sumBestRow.style.display = data.showSumBest ? '' : 'none';
          console.log('Sum of Best row display set from save file to:', data.showSumBest ? 'visible' : 'none');
        }
      }
      if (typeof data.showBestComplete === 'boolean') {
        if (document.getElementById('show-best-complete')) {
          document.getElementById('show-best-complete').checked = data.showBestComplete;
        }
        // Update the display immediately
        const bestCompleteRow = document.querySelector('tr[data-row="best-complete"]');
        if (bestCompleteRow) {
          bestCompleteRow.style.display = data.showBestComplete ? '' : 'none';
          console.log('Best Complete row display set from save file to:', data.showBestComplete ? 'visible' : 'none');
        }
      }
      
      // Load display settings if present (filter out color settings)
      if (data.displaySettings && typeof data.displaySettings === 'object') {
        console.log('Loading display settings from file:', data.displaySettings);
        
        // Only copy valid display settings properties, exclude colors
        const validDisplaySettings = {
          rowHeightPreset: data.displaySettings.rowHeightPreset || 'normal',
          rowHeight: data.displaySettings.rowHeight || 36,
          paddingTop: data.displaySettings.paddingTop ?? 8,
          paddingBottom: data.displaySettings.paddingBottom ?? 8,
          splitTableFontSize: data.displaySettings.splitTableFontSize || 14,
          totalTimerFontSize: data.displaySettings.totalTimerFontSize || 24,
          totalTimerBold: data.displaySettings.totalTimerBold || false,
          summaryFontSize: data.displaySettings.summaryFontSize || 16,
          globalFontFamily: data.displaySettings.globalFontFamily || 'system-ui',
          showSumBest: data.displaySettings.showSumBest ?? true,
          showBestComplete: data.displaySettings.showBestComplete ?? true
        };
        
        console.log('Filtered display settings:', validDisplaySettings);
        
        const globalSettings = loadGlobalSettings();
        globalSettings.displaySettings = validDisplaySettings;
        saveGlobalSettings(globalSettings);
        console.log('Display settings loaded and saved to localStorage');
        
        // Apply the loaded settings immediately
        updateDisplaySettings();
      }
      
      // Load column widths if present
      if (data.columnWidths && typeof data.columnWidths === 'object') {
        // Update the configuration form with loaded widths
        const widths = data.columnWidths;
        if (document.getElementById('col-split-width')) document.getElementById('col-split-width').value = widths.split || 150;
        if (document.getElementById('col-total-width')) document.getElementById('col-total-width').value = widths.total || 100;
        if (document.getElementById('col-segment-width')) document.getElementById('col-segment-width').value = widths.segment || 100;
        if (document.getElementById('col-diff-width')) document.getElementById('col-diff-width').value = widths.diff || 80;
        if (document.getElementById('col-diff-segment-width')) document.getElementById('col-diff-segment-width').value = widths.diffSegment || 80;
        if (document.getElementById('col-diff-complete-width')) document.getElementById('col-diff-complete-width').value = widths.diffComplete || 80;
        if (document.getElementById('col-best-total-width')) document.getElementById('col-best-total-width').value = widths.bestTotal || 100;
        if (document.getElementById('col-best-segment-width')) document.getElementById('col-best-segment-width').value = widths.bestSegment || 100;
        if (document.getElementById('col-best-complete-width')) document.getElementById('col-best-complete-width').value = widths.bestComplete || 100;
        
        // Save the loaded widths to the current state
        saveColumnWidths(widths);
        
        // Apply the column widths immediately
        updateColumnStyles();
      }
      
      // Load display settings if present
      if (data.displaySettings && typeof data.displaySettings === 'object') {
        // Update the configuration form with loaded display settings
        const settings = data.displaySettings;
        if (document.getElementById('row-height-preset')) document.getElementById('row-height-preset').value = settings.rowHeightPreset || 'normal';
        if (document.getElementById('row-height-value')) document.getElementById('row-height-value').value = settings.rowHeight || 36;
        if (document.getElementById('row-padding-top')) document.getElementById('row-padding-top').value = settings.paddingTop ?? 8;
        if (document.getElementById('row-padding-bottom')) document.getElementById('row-padding-bottom').value = settings.paddingBottom ?? 8;
        
        // Handle both old text-based and new numerical font sizes
        if (document.getElementById('split-table-font-size')) {
          document.getElementById('split-table-font-size').value = settings.splitTableFontSize || 14;
        }
        if (document.getElementById('total-timer-font-size')) {
          // Convert old text-based font sizes to numerical values for backward compatibility
          let totalTimerSize = settings.totalTimerFontSize || 24;
          if (typeof settings.totalTimerFont === 'string') {
            const fontSizeMap = { 'small': 16, 'normal': 20, 'large': 24, 'extra-large': 32 };
            totalTimerSize = fontSizeMap[settings.totalTimerFont] || 24;
          }
          document.getElementById('total-timer-font-size').value = totalTimerSize;
        }
        if (document.getElementById('summary-font-size')) {
          // Convert old text-based font sizes to numerical values for backward compatibility
          let summarySize = settings.summaryFontSize || 16;
          if (typeof settings.summaryFont === 'string') {
            const fontSizeMap = { 'small': 12, 'normal': 16, 'large': 20, 'extra-large': 24 };
            summarySize = fontSizeMap[settings.summaryFont] || 16;
          }
          document.getElementById('summary-font-size').value = summarySize;
        }
        
        // Handle background color
        if (document.getElementById('background-color-picker') && document.getElementById('background-color-hex')) {
          document.getElementById('background-color-picker').value = backgroundColor;
          document.getElementById('background-color-hex').value = backgroundColor;
        }
        
        if (document.getElementById('show-sum-best')) document.getElementById('show-sum-best').checked = settings.showSumBest ?? true;
        if (document.getElementById('show-best-complete')) document.getElementById('show-best-complete').checked = settings.showBestComplete ?? true;
        
        // Load new font settings
        if (document.getElementById('total-timer-bold')) document.getElementById('total-timer-bold').checked = settings.totalTimerBold || false;
        if (document.getElementById('global-font-family')) document.getElementById('global-font-family').value = settings.globalFontFamily || 'system-ui';
        
        // Create normalized settings object for saving
        const normalizedSettings = {
          ...settings,
          splitTableFontSize: settings.splitTableFontSize || 14,
          totalTimerFontSize: settings.totalTimerFontSize || (typeof settings.totalTimerFont === 'string' ? 
            { 'small': 16, 'normal': 20, 'large': 24, 'extra-large': 32 }[settings.totalTimerFont] || 24 : 24),
          totalTimerBold: settings.totalTimerBold || false,
          summaryFontSize: settings.summaryFontSize || (typeof settings.summaryFont === 'string' ? 
            { 'small': 12, 'normal': 16, 'large': 20, 'extra-large': 24 }[settings.summaryFont] || 16 : 16),
          globalFontFamily: settings.globalFontFamily || 'system-ui'
        };
        
        // Save the normalized display settings to the current state
        saveDisplaySettings(normalizedSettings);
        
        // Apply the display settings immediately
        updateDisplaySettings();
        document.documentElement.style.setProperty('--bg', backgroundColor);
      }
      
      // Load run statistics if present
      if (typeof data.runsStarted === 'number') {
        runsStarted = data.runsStarted;
      }
      if (typeof data.runsCompleted === 'number') {
        runsCompleted = data.runsCompleted;
      }
      updateRunStats();
      
      // Save the file path and add to recent files
      saveSavePath(filePath);
      addRecentFile(filePath);
      
      // Reset the timer state to match the loaded data
      doReset();
      
      // Re-render to show updated data
      renderRows();
      
      console.log('Configuration loaded from save file:', filePath);
    } catch (error) {
      console.error('Failed to load save file:', error);
      alert('Failed to load save file: ' + error.message);
    }
  }
  
  // Chosen save file path persistence
  function loadSavePath() {
    try { return localStorage.getItem(SAVE_PATH_KEY) || ''; } catch { return ''; }
  }
  function saveSavePath(p) {
    try {
      if (p) localStorage.setItem(SAVE_PATH_KEY, p);
      else localStorage.removeItem(SAVE_PATH_KEY);
    } catch {}
  }
  // Personal bests: cumulative totals per split and segment bests
  let bestTotals = [0, 0, 0];
  let bestSegments = [0, 0, 0];
  // Best complete run cumulative splits (only updated when a full run finishes and is better)
  let bestCompleteSplits = new Array(splitNames.length).fill(0);
  // Tauri ESM APIs (optional use; guarded if not available in non-tauri)
  let tauri;
  try {
    // dynamic import to avoid throwing outside Tauri
    // eslint-disable-next-line no-new-func
    tauri = { 
      appWindow: undefined,
      createWindow: undefined
    };
    // Load lazily when needed
  } catch {}
  // Load saved config + PBs ASAP so arrays initialize with correct sizes
  (function bootstrapFromStorage(){
    // Only load global settings at startup (lastUsed folders for file dialogs)
    const globalSettings = loadGlobalSettings();
    fpCurrentPath = globalSettings.lastSaveDir || null;
    imgCurrentPath = globalSettings.lastImageDir || null;
    
    // Reset to defaults for run-specific settings
    runTitle = 'Run Title';
    iconPath = '';
    splitNames = ['Split 1', 'Split 2', 'Split 3'];
    bestTotals = [0, 0, 0];
    bestSegments = [0, 0, 0];
    bestCompleteSplits = new Array(splitNames.length).fill(0);
    
    // Apply initial column visibility and display settings after a short delay to ensure DOM is ready
    setTimeout(() => {
      updateColumnVisibility();
      updateDisplaySettings();
    }, 100);
  })();

  // Configurable initial data
  // In-window configuration modal logic
  const cfgBackdrop = document.getElementById('cfg-backdrop');
  const cfgForm = document.getElementById('cfg-form');
  const cfgTitle = document.getElementById('cfg-title');
  const cfgIconPath = document.getElementById('cfg-icon-path');
  const cfgChooseIcon = document.getElementById('cfg-choose-icon');
  const cfgClearIcon = document.getElementById('cfg-clear-icon');
  const cfgCount = document.getElementById('cfg-count');
  const cfgSplitsTbody = document.getElementById('cfg-splits');
  const cfgCancel = document.getElementById('cfg-cancel');
  const cfgResetStorage = document.getElementById('cfg-reset-storage');
  
  // Configuration tab functionality
  const configTabs = document.querySelectorAll('.config-tab');
  const configTabContents = document.querySelectorAll('.config-tab-content');
  
  // Tab switching function
  function switchConfigTab(targetTab) {
    // Remove active class from all tabs and content
    configTabs.forEach(tab => tab.classList.remove('active'));
    configTabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    const activeTab = document.querySelector(`.config-tab[data-tab="${targetTab}"]`);
    const activeContent = document.querySelector(`.config-tab-content[data-tab="${targetTab}"]`);
    
    if (activeTab && activeContent) {
      activeTab.classList.add('active');
      activeContent.classList.add('active');
    }
  }
  
  // Add click listeners to tabs
  configTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchConfigTab(targetTab);
    });
  });
  
  // In-app file picker elements
  const fpBackdrop = document.getElementById('file-backdrop');
  const fpPath = document.getElementById('fp-path');
  const fpList = document.getElementById('fp-list');
  const fpHome = document.getElementById('fp-home');
  const fpUp = document.getElementById('fp-up');
  const fpFilename = document.getElementById('fp-filename');
  const fpChoose = document.getElementById('fp-choose');
  const fpCancel = document.getElementById('fp-cancel');

  async function fpInvoke(cmd, args) {
    console.log('fpInvoke called:', cmd, args);
    try {
      // @ts-ignore
      const result = await window.__TAURI__?.core?.invoke(cmd, args);
      console.log('fpInvoke result:', result);
      return result;
    } catch (error) {
      console.error('fpInvoke error:', error);
      throw error;
    }
  }
  async function fpListDir(path) {
    try { 
      const result = await fpInvoke('list_dir', { path }); 
      return result || [];
    } catch { 
      console.warn('list_dir failed, returning empty array');
      return []; 
    }
  }
  async function fpHomeDir() {
    try { 
      const result = await fpInvoke('home_dir');
      return result || '/home/user';
    } catch { 
      console.warn('home_dir failed, using fallback');
      return '/home/user';
    }
  }
  async function fpShow() { 
    console.log('fpShow called, fpBackdrop:', fpBackdrop);
    
    // Update modal title for save file selection
    const modalTitle = document.querySelector('#file-backdrop header h3');
    if (modalTitle) modalTitle.textContent = 'Choose Save File';
    
    fpBackdrop.hidden = false;
    
    // Navigate to saved directory or home on first show
    const targetPath = fpCurrentPath || await fpHomeDir();
    await fpNavigate(targetPath);
  }
  
  async function fpShowForImages() {
    console.log('fpShowForImages called');
    // Update modal title for image selection
    const modalTitle = document.querySelector('#file-backdrop header h3');
    if (modalTitle) modalTitle.textContent = 'Choose Icon Image';
    
    fpBackdrop.hidden = false;
    
    // Navigate to saved image directory or home on first show
    const targetPath = imgCurrentPath || await fpHomeDir();
    await fpNavigateForImages(targetPath);
  }
  
  async function fpNavigateForImages(path) {
    const entries = await fpListDir(path);
    imgCurrentPath = path;
    fpSetPath(path);
    fpRenderForImages(entries);
    
    // Save current directory to global settings
    const globalSettings = loadGlobalSettings();
    globalSettings.lastImageDir = path;
    saveGlobalSettings(globalSettings);
  }
  
  function fpRenderForImages(entries) {
    if (!fpList) return;
    fpList.innerHTML = '';
    
    // Filter to show directories and image files
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico'];
    const filteredEntries = entries.filter(e => 
      e.is_dir || imageExtensions.some(ext => e.name.toLowerCase().endsWith(ext))
    );
    
    for (const e of filteredEntries) {
      const div = document.createElement('div');
      div.className = 'fp-item';
      div.dataset.path = e.path;
      div.dataset.isdir = e.is_dir ? '1' : '';
      const icon = e.is_dir ? '📁 ' : '🖼️ ';
      div.innerHTML = `<span class="name">${icon}${e.name}</span><span class="meta">${e.is_dir ? 'dir' : 'image'}</span>`;
      div.addEventListener('click', async () => {
        if (e.is_dir) {
          await fpNavigateForImages(e.path);
        } else {
          if (fpFilename) fpFilename.value = e.name;
        }
      });
      fpList.appendChild(div);
    }
  }
  function fpHide() { fpBackdrop.hidden = true; }
  function fpSetPath(p) { if (fpPath) fpPath.textContent = p; }
  function fpRender(entries) {
    if (!fpList) return;
    fpList.innerHTML = '';
    for (const e of entries) {
      const div = document.createElement('div');
      div.className = 'fp-item';
      div.dataset.path = e.path;
      div.dataset.isdir = e.is_dir ? '1' : '';
      div.innerHTML = `<span class="name">${e.is_dir ? '📁 ' : '📄 '}${e.name}</span><span class="meta">${e.is_dir ? 'dir' : 'file'}</span>`;
      div.addEventListener('click', async () => {
        if (e.is_dir) {
          await fpNavigate(e.path);
        } else {
          if (fpFilename) fpFilename.value = e.name;
        }
      });
      fpList.appendChild(div);
    }
  }
  async function fpNavigate(path) {
    const entries = await fpListDir(path);
    fpCurrentPath = path;
    fpSetPath(path);
    fpRender(entries);
    
    // Save current directory to global settings
    const globalSettings = loadGlobalSettings();
    globalSettings.lastSaveDir = path;
    saveGlobalSettings(globalSettings);
  }

  // Convert icon path to displayable format (base64 for file paths, direct for relative paths)
  async function getIconDisplaySrc(iconPath) {
    if (!iconPath || iconPath.startsWith('spliticons/')) {
      // Default or relative path icons - use as-is
      return iconPath || 'spliticons/s_icon.png';
    }
    
    // Absolute path - convert to base64
    try {
      return await window.__TAURI__.core.invoke('read_image_as_base64', { path: iconPath });
    } catch (error) {
      console.log('Failed to load custom icon:', iconPath);
      return 'spliticons/s_icon.png'; // Fallback to default
    }
  }

  async function cfgRenderRows(n, names = []) {
    cfgSplitsTbody.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const tr = document.createElement('tr');
      
      // Build icon display for split configuration (clickable) with placeholder
      tr.innerHTML = `<td>${i + 1}</td><td><img src="spliticons/s_icon.png" class="split-icon" onclick="openIconSelector(${i})" alt="Split icon" title="Click to change icon"></td><td><input type="text" name="split-${i}" value="${names[i] || `Split ${i+1}`}" /></td>`;
      cfgSplitsTbody.appendChild(tr);
      
      // Load actual icon asynchronously
      (async () => {
        const iconSrc = await getIconDisplaySrc(splitIcons[i]);
        const iconImg = tr.querySelector('.split-icon');
        if (iconImg) iconImg.src = iconSrc;
      })();
    }
  }
  function openConfig() {
    cfgTitle.value = runTitle;
    cfgIconPath.value = iconPath;
    updateIconDisplay(); // Update icon preview in config
    console.log('Setting cfgCount from openConfig:', splitNames.length);
    cfgCount.value = String(splitNames.length);
    cfgRenderRows(splitNames.length, splitNames);
    
    // Load column visibility settings
    const visibility = getColumnVisibility();
    document.getElementById('col-split').checked = visibility.split;
    document.getElementById('col-total').checked = visibility.total;
    document.getElementById('col-segment').checked = visibility.segment;
    document.getElementById('col-diff').checked = visibility.diff;
    document.getElementById('col-diff-segment').checked = visibility.diffSegment;
    document.getElementById('col-diff-complete').checked = visibility.diffComplete;
    document.getElementById('col-best-total').checked = visibility.bestTotal;
    document.getElementById('col-best-segment').checked = visibility.bestSegment;
    document.getElementById('col-best-complete').checked = visibility.bestComplete;
    
    // Load column width settings
    const widths = getColumnWidths();
    Object.entries(widths).forEach(([colId, width]) => {
      const widthInput = document.getElementById(`col-${colId.replace(/([A-Z])/g, '-$1').toLowerCase()}-width`);
      if (widthInput) widthInput.value = width;
    });
    
    // Load display settings
    const displaySettings = getDisplaySettings();
    console.log('=== OPENING CONFIG DEBUG ===');
    console.log('Display settings loaded:', displaySettings);
    console.log('globalFontFamily from settings:', displaySettings.globalFontFamily);
    console.log('totalTimerBold from settings:', displaySettings.totalTimerBold);
    
    document.getElementById('row-height-preset').value = displaySettings.rowHeightPreset;
    document.getElementById('row-height-value').value = displaySettings.rowHeight;
    document.getElementById('row-padding-top').value = displaySettings.paddingTop;
    document.getElementById('row-padding-bottom').value = displaySettings.paddingBottom;
    document.getElementById('split-table-font-size').value = displaySettings.splitTableFontSize;
    document.getElementById('total-timer-font-size').value = displaySettings.totalTimerFontSize;
    document.getElementById('total-timer-bold').checked = displaySettings.totalTimerBold;
    document.getElementById('summary-font-size').value = displaySettings.summaryFontSize;
    document.getElementById('global-font-family').value = displaySettings.globalFontFamily;
    
    console.log('Font family dropdown after setting:', document.getElementById('global-font-family').value);
    console.log('Total timer bold checkbox after setting:', document.getElementById('total-timer-bold').checked);
    document.getElementById('background-color-picker').value = backgroundColor;
    document.getElementById('background-color-hex').value = backgroundColor;
    
    // Populate new color picker fields
    document.getElementById('run-title-color-picker').value = runTitleColor;
    document.getElementById('run-title-color-hex').value = runTitleColor;
    document.getElementById('split-table-color-picker').value = splitTableColor;
    document.getElementById('split-table-color-hex').value = splitTableColor;
    document.getElementById('total-timer-text-color-picker').value = totalTimerTextColor;
    document.getElementById('total-timer-text-color-hex').value = totalTimerTextColor;
    document.getElementById('total-timer-digits-color-picker').value = totalTimerDigitsColor;
    document.getElementById('total-timer-digits-color-hex').value = totalTimerDigitsColor;
    document.getElementById('sum-best-segments-color-picker').value = sumBestSegmentsColor;
    document.getElementById('sum-best-segments-color-hex').value = sumBestSegmentsColor;
    document.getElementById('best-complete-run-color-picker').value = bestCompleteRunColor;
    document.getElementById('best-complete-run-color-hex').value = bestCompleteRunColor;
    document.getElementById('split-bg-1-color-picker').value = splitBg1Color;
    document.getElementById('split-bg-1-color-hex').value = splitBg1Color;
    document.getElementById('split-bg-2-color-picker').value = splitBg2Color;
    document.getElementById('split-bg-2-color-hex').value = splitBg2Color;
    document.getElementById('show-sum-best').checked = displaySettings.showSumBest;
    document.getElementById('show-best-complete').checked = displaySettings.showBestComplete;
    
    // Load and setup hotkey configuration
    const hotkeys = getHotkeySettings();
    ['start-split', 'stop', 'reset-save', 'reset-no-save', 'unsplit'].forEach(action => {
      updateHotkeyDisplay(action);
    });
    setupHotkeyInputs();
    
    cfgBackdrop.hidden = false;
  }
  function closeConfig() { cfgBackdrop.hidden = true; }
  cfgBackdrop?.addEventListener('mousedown', (e) => { if (e.target === cfgBackdrop) closeConfig(); });
  cfgCancel?.addEventListener('click', (e) => { e.preventDefault(); closeConfig(); });
  const clampCount = (v) => Math.max(1, Math.min(50, Number(v) || 1));
  cfgCount?.addEventListener('input', () => {
    const n = clampCount(cfgCount.value);
    console.log('Setting cfgCount from input event:', n);
    cfgCount.value = String(n);
    // If row count mismatches, re-render rows
    if (cfgSplitsTbody.querySelectorAll('input').length !== n) {
      // Gather current split names from input fields to preserve them
      const currentNames = Array.from(cfgSplitsTbody.querySelectorAll('input')).map(input => input.value);
      cfgRenderRows(n, currentNames);
      
      // Update splitNames array to match the new count immediately
      // This ensures splitNames.length matches the UI count for icon selection
      while (splitNames.length < n) {
        splitNames.push(`Split ${splitNames.length + 1}`);
      }
      if (splitNames.length > n) {
        splitNames = splitNames.slice(0, n);
      }
      
      // Also ensure splitIcons array matches
      while (splitIcons.length < n) {
        splitIcons.push('');
      }
      if (splitIcons.length > n) {
        splitIcons = splitIcons.slice(0, n);
      }
    }
  });
  cfgForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      // Derive intended count even if the number input is momentarily empty/invalid
      const raw = (cfgCount.value ?? '').toString().trim();
      let nParsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(nParsed)) {
        // Fallback to current rows or existing split count
        const rowInputs = cfgSplitsTbody.querySelectorAll('input').length;
        nParsed = rowInputs || splitNames.length || 1;
      }
      const n = clampCount(nParsed);
      // Gather names from existing inputs; if fewer than n, fill defaults
      const inputs = Array.from(cfgSplitsTbody.querySelectorAll('input'));
      let names = inputs.map((i) => i.value.trim() || 'Split');
      while (names.length < n) names.push(`Split ${names.length + 1}`);
      if (names.length > n) names = names.slice(0, n);
      runTitle = cfgTitle.value.trim() || 'Run Title';
      iconPath = cfgIconPath.value.trim() || '';
      splitNames = names;
      // Resize PB arrays to follow new split count
      bestTotals = (bestTotals || []).slice(0, splitNames.length);
      while (bestTotals.length < splitNames.length) bestTotals.push(0);
      bestSegments = (bestSegments || []).slice(0, splitNames.length);
      while (bestSegments.length < splitNames.length) bestSegments.push(0);
      bestCompleteSplits = (bestCompleteSplits || []).slice(0, splitNames.length);
      while (bestCompleteSplits.length < splitNames.length) bestCompleteSplits.push(0);
      // Resize splitIcons array to match split count
      splitIcons = (splitIcons || []).slice(0, splitNames.length);
      while (splitIcons.length < splitNames.length) splitIcons.push('');
      // Resize state arrays, preserving existing elapsed where possible
      segmentElapsed = (segmentElapsed || []).slice(0, splitNames.length);
      while (segmentElapsed.length < splitNames.length) segmentElapsed.push(0);
      totalCumulative = new Array(splitNames.length).fill(0);
      
      // Save column visibility settings
      const visibility = {
        split: document.getElementById('col-split').checked,
        total: document.getElementById('col-total').checked,
        segment: document.getElementById('col-segment').checked,
        diff: document.getElementById('col-diff').checked,
        diffSegment: document.getElementById('col-diff-segment').checked,
        diffComplete: document.getElementById('col-diff-complete').checked,
        bestTotal: document.getElementById('col-best-total').checked,
        bestSegment: document.getElementById('col-best-segment').checked,
        bestComplete: document.getElementById('col-best-complete').checked
      };
      saveColumnVisibility(visibility);
      
      // Save column width settings
      const widths = {
        split: parseInt(document.getElementById('col-split-width').value) || 150,
        total: parseInt(document.getElementById('col-total-width').value) || 100,
        segment: parseInt(document.getElementById('col-segment-width').value) || 100,
        diff: parseInt(document.getElementById('col-diff-width').value) || 80,
        diffSegment: parseInt(document.getElementById('col-diff-segment-width').value) || 80,
        diffComplete: parseInt(document.getElementById('col-diff-complete-width').value) || 80,
        bestTotal: parseInt(document.getElementById('col-best-total-width').value) || 100,
        bestSegment: parseInt(document.getElementById('col-best-segment-width').value) || 100,
        bestComplete: parseInt(document.getElementById('col-best-complete-width').value) || 100
      };
      saveColumnWidths(widths);
      
      // Save display settings
      const displaySettings = {
        rowHeightPreset: document.getElementById('row-height-preset').value,
        rowHeight: parseInt(document.getElementById('row-height-value').value) || 36,
        paddingTop: parseInt(document.getElementById('row-padding-top').value) ?? 8,
        paddingBottom: parseInt(document.getElementById('row-padding-bottom').value) ?? 8,
        splitTableFontSize: parseInt(document.getElementById('split-table-font-size').value) || 14,
        totalTimerFontSize: parseInt(document.getElementById('total-timer-font-size').value) || 24,
        totalTimerBold: document.getElementById('total-timer-bold').checked || false,
        summaryFontSize: parseInt(document.getElementById('summary-font-size').value) || 16,
        globalFontFamily: document.getElementById('global-font-family').value || 'system-ui',
        showSumBest: document.getElementById('show-sum-best').checked,
        showBestComplete: document.getElementById('show-best-complete').checked
      };
      console.log('=== FORM SUBMIT DISPLAY SETTINGS ===');
      console.log('Form submit displaySettings:', displaySettings);
      saveDisplaySettings(displaySettings);
      
      // Save color settings to global variables (not in displaySettings)
      backgroundColor = document.getElementById('background-color-hex').value || '#0e0f13';
      runTitleColor = document.getElementById('run-title-color-hex').value || '#c9d1d9';
      splitTableColor = document.getElementById('split-table-color-hex').value || '#c9d1d9';
      totalTimerTextColor = document.getElementById('total-timer-text-color-hex').value || '#8b9bb4';
      totalTimerDigitsColor = document.getElementById('total-timer-digits-color-hex').value || '#c9d1d9';
      sumBestSegmentsColor = document.getElementById('sum-best-segments-color-hex').value || '#c9d1d9';
      bestCompleteRunColor = document.getElementById('best-complete-run-color-hex').value || '#c9d1d9';
      splitBg1Color = document.getElementById('split-bg-1-color-hex').value || '#0000000a';
      splitBg2Color = document.getElementById('split-bg-2-color-hex').value || '#00000015';
      
      // Get current column widths to include in save
      const currentWidths = getColumnWidths();
      
      // Persist settings immediately
      saveState({ 
        runTitle, iconPath, splitNames, splitIcons, bestTotals, bestSegments, bestCompleteSplits, 
        columnWidths: currentWidths, backgroundColor, runTitleColor, splitTableColor, 
        totalTimerTextColor, totalTimerDigitsColor, sumBestSegmentsColor, bestCompleteRunColor, 
        splitBg1Color, splitBg2Color,
        showSumBest: document.getElementById('show-sum-best')?.checked ?? true,
        showBestComplete: document.getElementById('show-best-complete')?.checked ?? true,
        runsStarted, runsCompleted
      });
      // Reset and re-render (silent)
      doReset();
      renderRows();
      updateColumnVisibility(); // Apply column visibility after rendering
      updateDisplaySettings(); // Apply display settings after rendering
      document.documentElement.style.setProperty('--bg', backgroundColor); // Apply background color
      document.documentElement.style.setProperty('--run-title-color', runTitleColor);
      document.documentElement.style.setProperty('--split-table-color', splitTableColor);
      document.documentElement.style.setProperty('--total-timer-text-color', totalTimerTextColor);
      document.documentElement.style.setProperty('--total-timer-digits-color', totalTimerDigitsColor);
      document.documentElement.style.setProperty('--split-bg-1', splitBg1Color);
      document.documentElement.style.setProperty('--split-bg-2', splitBg2Color);
    } finally {
      closeConfig();
    }
  });

  // File browser modal implementation
  async function showFileBrowser() {
    const modal = document.createElement('div');
    modal.className = 'file-browser-modal';
    modal.innerHTML = `
      <div class="file-browser-content">
        <div class="file-browser-header">
          <h3>Choose Save File Location</h3>
          <button class="close-btn" onclick="this.closest('.file-browser-modal').remove()">×</button>
        </div>
        <div class="file-browser-path">
          <button id="fbHome">🏠</button>
          <button id="fbUp">⬆️</button>
          <span id="fbPath">/</span>
        </div>
        <div class="file-browser-list" id="fbList">
          Loading...
        </div>
        <div class="file-browser-input">
          <input type="text" id="fbFilename" placeholder="splits.json">
          <button id="fbChoose">Choose</button>
          <button id="fbCancel">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentPath = '/';
    let initialFilename = 'splits.json';
    
    // Check if we have a previously saved path
    const savedPath = loadSavePath();
    if (savedPath) {
      // Extract directory and filename from saved path
      const lastSlash = savedPath.lastIndexOf('/');
      if (lastSlash !== -1) {
        currentPath = savedPath.substring(0, lastSlash) || '/';
        initialFilename = savedPath.substring(lastSlash + 1) || 'splits.json';
      }
    }
    
    // Fall back to home directory if the saved directory doesn't exist or no saved path
    if (!savedPath) {
      try {
        currentPath = await window.__TAURI__.core.invoke('home_dir');
      } catch (error) {
        console.error('Failed to get home directory:', error);
      }
    }
    
    // Set initial filename
    document.getElementById('fbFilename').value = initialFilename;
    document.getElementById('fbPath').textContent = currentPath;
    
    // Navigation functions
    async function navigate(path) {
      try {
        const entries = await window.__TAURI__.core.invoke('list_dir', { path });
        currentPath = path;
        document.getElementById('fbPath').textContent = path;
        
        const list = document.getElementById('fbList');
        list.innerHTML = '';
        
        // Add directories and files
        entries.forEach(entry => {
          const item = document.createElement('div');
          item.className = 'file-browser-item';
          item.textContent = entry.name + (entry.is_dir ? '/' : '');
          item.onclick = () => {
            if (entry.is_dir) {
              const newPath = path.endsWith('/') ? path + entry.name : path + '/' + entry.name;
              navigate(newPath);
            } else {
              document.getElementById('fbFilename').value = entry.name;
            }
          };
          list.appendChild(item);
        });
      } catch (error) {
        console.error('Failed to list directory:', error);
        document.getElementById('fbList').innerHTML = 'Error loading directory';
      }
    }
    
    // Initial navigation
    await navigate(currentPath);
    
    // Event handlers
    document.getElementById('fbHome').onclick = async () => {
      try {
        const home = await window.__TAURI__.core.invoke('home_dir');
        await navigate(home);
      } catch (error) {
        console.error('Failed to navigate to home:', error);
      }
    };
    
    document.getElementById('fbUp').onclick = async () => {
      const parent = currentPath.replace(/\/[^\/]*\/?$/, '') || '/';
      await navigate(parent);
    };
    
    return new Promise((resolve) => {
      document.getElementById('fbChoose').onclick = async () => {
        console.log('fbChoose clicked');
        const filename = document.getElementById('fbFilename').value.trim();
        console.log('Filename:', filename);
        if (filename) {
          const fullPath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
          console.log('Full path:', fullPath);
          
          // Create the file if it doesn't exist
          try {
            await window.__TAURI__.core.invoke('make_parent_dirs', { path: fullPath });
            // Create empty file with basic structure
            const defaultContent = JSON.stringify({
              runTitle: "Run Title",
              iconPath: "",
              splitNames: ["Split 1", "Split 2", "Split 3"],
              splitIcons: ["", "", ""],
              backgroundColor: "#2c3e50",
              runTitleColor: "#ecf0f1",
              splitTableColor: "#ecf0f1",
              totalTimerTextColor: "#ecf0f1",
              totalTimerDigitsColor: "#e74c3c",
              sumBestSegmentsColor: "#e74c3c",
              bestCompleteRunColor: "#e74c3c",
              splitBg1Color: "#34495e",
              splitBg2Color: "#2c3e50",
              bestTotals: [],
              bestSegments: [],
              bestCompleteSplits: [],
              columnWidths: {
                split: 150,
                total: 100,
                segment: 100,
                diff: 80,
                diffSegment: 80,
                diffComplete: 80,
                bestTotal: 100,
                bestSegment: 100,
                bestComplete: 100
              },
              displaySettings: {
                rowHeightPreset: 'normal',
                rowHeight: 36,
                paddingTop: 8,
                paddingBottom: 8,
                splitTableFontSize: 14,
                totalTimerFontSize: 24,
                totalTimerBold: false,
                summaryFontSize: 16,
                globalFontFamily: 'system-ui',
                showSumBest: true,
                showBestComplete: true
              }
            }, null, 2);
            await window.__TAURI__.core.invoke('write_text_file', { path: fullPath, contents: defaultContent });
            console.log('Created new file:', fullPath);
          } catch (error) {
            // File might already exist, that's okay
            console.log('File creation note:', error);
          }
          
          console.log('About to save path...');
          saveSavePath(fullPath);
          console.log('Path saved, updating UI...');
          const cfgSavePath = document.getElementById('cfg-save-path');
          console.log('Found cfgSavePath element:', !!cfgSavePath);
          if (cfgSavePath) {
            cfgSavePath.value = fullPath;
            console.log('Updated input value to:', cfgSavePath.value);
          }
          
          // Try to load existing file content
          try {
            const fileContent = await window.__TAURI__.core.invoke('read_text_file', { path: fullPath });
            const data = JSON.parse(fileContent);
            console.log('Loaded existing save file:', data);
            
            // Update configuration from loaded data
            if (typeof data.runTitle === 'string') {
              runTitle = data.runTitle;
              if (cfgTitle) cfgTitle.value = runTitle;
            }
            if (typeof data.iconPath === 'string') {
              iconPath = data.iconPath;
              if (cfgIconPath) cfgIconPath.value = iconPath;
            }
            if (Array.isArray(data.splitNames) && data.splitNames.length > 0) {
              splitNames = [...data.splitNames];
              if (cfgCount) {
                console.log('Setting cfgCount from file load:', splitNames.length);
                cfgCount.value = String(splitNames.length);
              }
              // Update split name inputs if config is open
              if (cfgSplitsTbody) {
                cfgRenderRows(splitNames.length, splitNames);
              }
            }
            if (Array.isArray(data.bestTotals)) bestTotals = [...data.bestTotals];
            if (Array.isArray(data.bestSegments)) bestSegments = [...data.bestSegments];
            if (Array.isArray(data.bestCompleteSplits)) bestCompleteSplits = [...data.bestCompleteSplits];
            
            // Update the main UI
            renderRows();
            updateIconDisplay();
            
            console.log('Configuration loaded from file successfully');
          } catch (error) {
            console.log('File does not exist yet or could not be loaded:', error);
          }
          
          console.log('Save path set to:', fullPath);
        }
        console.log('About to close modal...');
        modal.remove();
        console.log('Modal removed, resolving promise...');
        resolve();
      };
      
      document.getElementById('fbCancel').onclick = () => {
        modal.remove();
        resolve();
      };
      
      // Close on backdrop click
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve();
        }
      };
    });
  }

  // Image browser modal implementation (for icons)
  async function showImageBrowser() {
    const modal = document.createElement('div');
    modal.className = 'file-browser-modal';
    modal.innerHTML = `
      <div class="file-browser-content">
        <div class="file-browser-header">
          <h3>Choose Icon Image</h3>
          <button class="close-btn" onclick="this.closest('.file-browser-modal').remove()">×</button>
        </div>
        <div class="file-browser-path">
          <button id="fbHomeIcon">🏠</button>
          <button id="fbUpIcon">⬆️</button>
          <span id="fbPathIcon">/</span>
        </div>
        <div class="file-browser-list" id="fbListIcon">
          Loading...
        </div>
        <div class="file-browser-input">
          <input type="text" id="fbFilenameIcon" placeholder="image.png">
          <button id="fbChooseIcon">Choose</button>
          <button id="fbCancelIcon">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentPath = '/';
    let initialFilename = '';
    
    // Check if we have a previously saved icon path
    if (iconPath) {
      const lastSlash = iconPath.lastIndexOf('/');
      if (lastSlash !== -1) {
        currentPath = iconPath.substring(0, lastSlash) || '/';
        initialFilename = iconPath.substring(lastSlash + 1) || '';
      }
    }
    
    // Fall back to home directory if no icon path
    if (!iconPath) {
      try {
        currentPath = await window.__TAURI__.core.invoke('home_dir');
      } catch (error) {
        console.error('Failed to get home directory:', error);
      }
    }
    
    // Set initial filename
    document.getElementById('fbFilenameIcon').value = initialFilename;
    document.getElementById('fbPathIcon').textContent = currentPath;
    
    // Image file extensions to filter for
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico'];
    
    // Navigation functions
    async function navigate(path) {
      try {
        const entries = await window.__TAURI__.core.invoke('list_dir', { path });
        currentPath = path;
        document.getElementById('fbPathIcon').textContent = path;
        
        const list = document.getElementById('fbListIcon');
        list.innerHTML = '';
        
        // Add directories and image files only
        entries.forEach(entry => {
          const isImageFile = !entry.is_dir && imageExts.some(ext => 
            entry.name.toLowerCase().endsWith(ext));
          
          if (entry.is_dir || isImageFile) {
            const item = document.createElement('div');
            item.className = 'file-browser-item';
            item.textContent = entry.name + (entry.is_dir ? '/' : '');
            item.onclick = () => {
              if (entry.is_dir) {
                const newPath = path.endsWith('/') ? path + entry.name : path + '/' + entry.name;
                navigate(newPath);
              } else {
                document.getElementById('fbFilenameIcon').value = entry.name;
              }
            };
            list.appendChild(item);
          }
        });
      } catch (error) {
        console.error('Failed to list directory:', error);
        document.getElementById('fbListIcon').innerHTML = 'Error loading directory';
      }
    }
    
    // Initial navigation
    await navigate(currentPath);
    
    // Event handlers
    document.getElementById('fbHomeIcon').onclick = async () => {
      try {
        const home = await window.__TAURI__.core.invoke('home_dir');
        await navigate(home);
      } catch (error) {
        console.error('Failed to navigate to home:', error);
      }
    };
    
    document.getElementById('fbUpIcon').onclick = async () => {
      const parent = currentPath.replace(/\/[^\/]*\/?$/, '') || '/';
      await navigate(parent);
    };
    
    return new Promise((resolve) => {
      document.getElementById('fbChooseIcon').onclick = async () => {
        const filename = document.getElementById('fbFilenameIcon').value.trim();
        if (filename) {
          const fullPath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
          iconPath = fullPath;
          cfgIconPath.value = iconPath;
          updateIconDisplay(); // Update icon display
          console.log('Icon path set to:', iconPath);
        }
        modal.remove();
        resolve();
      };
      
      document.getElementById('fbCancelIcon').onclick = () => {
        modal.remove();
        resolve();
      };
      
      // Close on backdrop click
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve();
        }
      };
    });
  }

  // File browser for opening split files
  async function showFileBrowserForOpen() {
    const modal = document.createElement('div');
    modal.className = 'file-browser-modal';
    modal.innerHTML = `
      <div class="file-browser-content">
        <div class="file-browser-header">
          <h3>Open Split File</h3>
          <button class="close-btn" onclick="this.closest('.file-browser-modal').remove()">×</button>
        </div>
        <div class="file-browser-path">
          <button id="fbHomeOpen">🏠</button>
          <button id="fbUpOpen">⬆️</button>
          <span id="fbPathOpen">/</span>
        </div>
        <div class="file-browser-list" id="fbListOpen">
          Loading...
        </div>
        <div class="file-browser-input">
          <input type="text" id="fbFilenameOpen" placeholder="splits.json">
          <button id="fbOpenFile">Open</button>
          <button id="fbCancelOpen">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentPath = '/';
    
    // Initialize with home directory
    try {
      currentPath = await window.__TAURI__.core.invoke('home_dir');
    } catch (error) {
      console.error('Failed to get home directory:', error);
      currentPath = '/';
    }
    
    // Load directory function
    async function loadDir(path) {
      try {
        const result = await window.__TAURI__.core.invoke('list_dir', { path });
        const listEl = document.getElementById('fbListOpen');
        const pathEl = document.getElementById('fbPathOpen');
        
        pathEl.textContent = path;
        currentPath = path;
        
        listEl.innerHTML = '';
        
        // Sort: directories first, then files
        result.sort((a, b) => {
          if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        
        result.forEach(item => {
          const el = document.createElement('div');
          el.className = 'file-browser-item';
          el.innerHTML = `${item.is_dir ? '📁' : '📄'} ${item.name}`;
          el.onclick = () => {
            if (item.is_dir) {
              const newPath = path.endsWith('/') ? path + item.name : path + '/' + item.name;
              loadDir(newPath);
            } else {
              document.getElementById('fbFilenameOpen').value = item.name;
            }
          };
          listEl.appendChild(el);
        });
      } catch (error) {
        console.error('Failed to read directory:', error);
        document.getElementById('fbListOpen').innerHTML = 'Failed to load directory';
      }
    }
    
    // Event handlers
    document.getElementById('fbHomeOpen').onclick = () => loadDir('/');
    document.getElementById('fbUpOpen').onclick = () => {
      const parts = currentPath.split('/').filter(p => p);
      if (parts.length > 0) {
        parts.pop();
        loadDir('/' + parts.join('/'));
      }
    };
    
    document.getElementById('fbOpenFile').onclick = () => {
      const filename = document.getElementById('fbFilenameOpen').value.trim();
      if (filename) {
        const fullPath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
        console.log('Opening file:', fullPath);
        modal.remove();
        loadSplitFileFromPath(fullPath);
      }
    };
    
    document.getElementById('fbCancelOpen').onclick = () => {
      modal.remove();
    };
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
    
    // Load initial directory
    loadDir('/');
  }

  // Config: choose / clear icon file
  cfgChooseIcon?.addEventListener('click', async () => {
    console.log('Choose Icon clicked');
    
    try {
      // Show file browser modal for images
      await fpShowForImages();
    } catch (error) {
      console.error('Failed to open image browser:', error);
      // Fallback: prompt for file path
      const newPath = prompt('Enter the full path to an image file (PNG, JPG, GIF):', iconPath);
      if (newPath !== null) {
        iconPath = newPath.trim();
        cfgIconPath.value = iconPath;
        console.log('Icon path set to:', iconPath);
      }
    }
  });
  cfgClearIcon?.addEventListener('click', () => { 
    iconPath = ''; 
    cfgIconPath.value = ''; 
    updateIconDisplay(); // Update icon display
    console.log('Icon cleared');
  });

  // Wire up file picker navigation
  fpHome?.addEventListener('click', async () => {
    const home = await fpHomeDir();
    await fpNavigate(home);
  });
  fpUp?.addEventListener('click', async () => {
    const curr = fpPath?.textContent || '/';
    const parent = curr.replace(/\/[^\/]*\/?$/, '') || '/';
    // Use appropriate navigation based on current mode
    const modalTitle = document.querySelector('#file-backdrop header h3')?.textContent || '';
    if (modalTitle.includes('Icon')) {
      await fpNavigateForImages(parent);
    } else {
      await fpNavigate(parent);
    }
  });
  
  fpChoose?.addEventListener('click', async () => {
    const filename = fpFilename?.value?.trim();
    if (!filename) {
      alert('Please enter a filename');
      return;
    }
    
    const currentPath = fpPath?.textContent || '/';
    const fullPath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
    
    // Check if we're choosing a save file or image
    const modalTitle = document.querySelector('#file-backdrop header h3')?.textContent || '';
    
    if (modalTitle.includes('Icon')) {
      // Image selection
      iconPath = fullPath;
      if (cfgIconPath) cfgIconPath.value = iconPath;
      updateIconDisplay();
      console.log('Icon path set to:', iconPath);
      
      // Save the image directory to global settings
      const globalSettings = loadGlobalSettings();
      globalSettings.lastImageDir = currentPath;
      saveGlobalSettings(globalSettings);
    } else {
      // Save file selection
      try {
        // Create parent directories if they don't exist
        await fpInvoke('make_parent_dirs', { path: fullPath });
        
        // Try to create the file if it doesn't exist
        try {
          console.log('=== FILE SAVE DEBUG ===');
          console.log('runTitle:', runTitle);
          console.log('iconPath:', iconPath);
          console.log('splitNames:', splitNames);
          console.log('splitIcons variable:', splitIcons);
          console.log('splitIcons type:', typeof splitIcons);
          console.log('splitIcons length:', splitIcons?.length);
          console.log('splitIcons array:', JSON.stringify(splitIcons));
          
          const displaySettings = getDisplaySettings();
          console.log('Display settings to save:', displaySettings);
          
          const saveData = {
            runTitle: runTitle || 'Run Title',
            iconPath: iconPath || '',
            splitNames: splitNames || ['Split 1'],
            splitIcons: splitIcons || [''],
            bestTotals: bestTotals || [0],
            bestSegments: bestSegments || [0],
            bestCompleteSplits: bestCompleteSplits || [0],
            backgroundColor: backgroundColor || '#0e0f13',
            runTitleColor: runTitleColor || '#c9d1d9',
            splitTableColor: splitTableColor || '#c9d1d9',
            totalTimerTextColor: totalTimerTextColor || '#8b9bb4',
            totalTimerDigitsColor: totalTimerDigitsColor || '#c9d1d9',
            sumBestSegmentsColor: sumBestSegmentsColor || '#c9d1d9',
            bestCompleteRunColor: bestCompleteRunColor || '#c9d1d9',
            splitBg1Color: splitBg1Color || '#0000000a',
            splitBg2Color: splitBg2Color || '#00000015',
            displaySettings: displaySettings
          };
          console.log('=== COMPLETE SAVE DATA ===');
          console.log('saveData:', saveData);
          console.log('saveData.splitIcons:', saveData.splitIcons);
          console.log('JSON stringified:', JSON.stringify(saveData, null, 2));
          
          await fpInvoke('write_text_file', { 
            path: fullPath, 
            contents: JSON.stringify(saveData, null, 2)
          });
        } catch (writeError) {
          console.warn('Could not create file, it may already exist:', writeError);
        }
        
        // Load the save file and add to recent files
        await loadSaveFile(fullPath);
        
        // Save the save file directory to global settings
        const globalSettings = loadGlobalSettings();
        globalSettings.lastSaveDir = currentPath;
        saveGlobalSettings(globalSettings);
      } catch (error) {
        console.error('Failed to handle save file:', error);
        alert('Failed to create or access save file: ' + error.message);
      }
    }
    
    fpHide();
  });
  
  fpCancel?.addEventListener('click', () => {
    fpHide();
  });
  
  // Real-time configuration updates
  const columnCheckboxes = ['col-split', 'col-total', 'col-segment', 'col-diff', 'col-diff-segment', 'col-diff-complete', 'col-best-total', 'col-best-segment', 'col-best-complete'];
  columnCheckboxes.forEach(id => {
    const checkbox = document.getElementById(id);
    checkbox?.addEventListener('change', () => {
      updateConfigurationLive();
    });
  });
  
  // Column width inputs
  const columnWidthInputs = [
    'col-split-width', 'col-total-width', 'col-segment-width', 'col-diff-width', 'col-diff-segment-width', 'col-diff-complete-width',
    'col-best-total-width', 'col-best-segment-width', 'col-best-complete-width'
  ];
  columnWidthInputs.forEach(id => {
    const input = document.getElementById(id);
    input?.addEventListener('input', () => {
      updateConfigurationLive();
    });
  });
  
  // Display setting controls
  const displayControls = [
    'row-height-preset', 'row-height-value', 'row-padding-top', 'row-padding-bottom',
    'row-margin-top', 'row-margin-bottom', 'split-table-font-size', 'total-timer-font-size', 'total-timer-bold', 'summary-font-size', 'global-font-family',
    'background-color-picker', 'background-color-hex', 'show-sum-best', 'show-best-complete'
  ];
  displayControls.forEach(id => {
    const control = document.getElementById(id);
    if (control) {
      if (control.type === 'checkbox') {
        control.addEventListener('change', () => {
          updateConfigurationLive();
        });
      } else {
        control.addEventListener('input', () => {
          updateConfigurationLive();
        });
        control.addEventListener('change', () => {
          updateConfigurationLive();
        });
      }
    }
  });

  // Row height preset functionality
  const rowHeightPreset = document.getElementById('row-height-preset');
  rowHeightPreset?.addEventListener('change', () => {
    const preset = rowHeightPreset.value;
    const presets = {
      compact: { height: 28, paddingTop: 4, paddingBottom: 4 },
      normal: { height: 36, paddingTop: 8, paddingBottom: 8 },
      large: { height: 48, paddingTop: 12, paddingBottom: 12 },
      'extra-large': { height: 60, paddingTop: 18, paddingBottom: 18 }
    };
    
    if (presets[preset]) {
      document.getElementById('row-height-value').value = presets[preset].height;
      document.getElementById('row-padding-top').value = presets[preset].paddingTop;
      document.getElementById('row-padding-bottom').value = presets[preset].paddingBottom;
    }
    updateConfigurationLive();
  });
  
  // Background color sync functionality
  const backgroundColorPicker = document.getElementById('background-color-picker');
  const backgroundColorHex = document.getElementById('background-color-hex');
  
  // Sync color picker to hex input
  backgroundColorPicker?.addEventListener('input', () => {
    const color = backgroundColorPicker.value;
    if (backgroundColorHex) {
      backgroundColorHex.value = color;
    }
    updateConfigurationLive();
  });
  
  // Sync hex input to color picker (with validation)
  backgroundColorHex?.addEventListener('input', () => {
    const hex = backgroundColorHex.value;
    // Validate color format
    if (isValidColor(hex)) {
      // Only update color picker if it's a valid hex color
      if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hex) && backgroundColorPicker) {
        backgroundColorPicker.value = hex.slice(0, 7);
      }
      updateConfigurationLive();
    }
  });
  
  // Also sync on blur to handle partial inputs
  backgroundColorHex?.addEventListener('blur', () => {
    const hex = backgroundColorHex.value;
    if (!isValidColor(hex)) {
      // Reset to current picker value if invalid
      if (backgroundColorPicker) {
        backgroundColorHex.value = backgroundColorPicker.value;
      }
    }
  });
  
  // Add event handlers for all the new color pickers
  function isValidColor(color) {
    // Support hex colors (6 or 8 digits), CSS color names, and special values
    if (!color) return false;
    if (color === 'transparent') return true;
    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(color)) return true;
    
    // Test if it's a valid CSS color by creating a temporary element
    const testEl = document.createElement('div');
    testEl.style.color = color;
    return testEl.style.color !== '';
  }
  
  function setupColorPicker(pickerId, hexId) {
    const picker = document.getElementById(pickerId);
    const hex = document.getElementById(hexId);
    
    picker?.addEventListener('input', () => {
      const color = picker.value;
      if (hex) {
        hex.value = color;
      }
      updateConfigurationLive();
    });
    
    hex?.addEventListener('input', () => {
      const hexValue = hex.value;
      if (isValidColor(hexValue)) {
        // Only update color picker if it's a valid hex color (not transparent/keywords)
        if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hexValue) && picker) {
          picker.value = hexValue.slice(0, 7); // Color input only supports 6-digit hex
        }
        updateConfigurationLive();
      }
    });
    
    hex?.addEventListener('blur', () => {
      const hexValue = hex.value;
      if (!isValidColor(hexValue)) {
        if (picker) {
          hex.value = picker.value;
        }
      }
    });
  }
  
  // Setup all new color pickers
  setupColorPicker('run-title-color-picker', 'run-title-color-hex');
  setupColorPicker('split-table-color-picker', 'split-table-color-hex');
  setupColorPicker('total-timer-text-color-picker', 'total-timer-text-color-hex');
  setupColorPicker('total-timer-digits-color-picker', 'total-timer-digits-color-hex');
  setupColorPicker('sum-best-segments-color-picker', 'sum-best-segments-color-hex');
  setupColorPicker('best-complete-run-color-picker', 'best-complete-run-color-hex');
  setupColorPicker('split-bg-1-color-picker', 'split-bg-1-color-hex');
  setupColorPicker('split-bg-2-color-picker', 'split-bg-2-color-hex');
  
  function updateConfigurationLive() {
    // Update column visibility
    const visibility = {
      split: document.getElementById('col-split').checked,
      total: document.getElementById('col-total').checked,
      segment: document.getElementById('col-segment').checked,
      diff: document.getElementById('col-diff').checked,
      diffSegment: document.getElementById('col-diff-segment').checked,
      diffComplete: document.getElementById('col-diff-complete').checked,
      bestTotal: document.getElementById('col-best-total').checked,
      bestSegment: document.getElementById('col-best-segment').checked,
      bestComplete: document.getElementById('col-best-complete').checked
    };
    saveColumnVisibility(visibility);
    
    // Update column widths
    const widths = {
      split: parseInt(document.getElementById('col-split-width')?.value) || 150,
      total: parseInt(document.getElementById('col-total-width')?.value) || 100,
      segment: parseInt(document.getElementById('col-segment-width')?.value) || 100,
      diff: parseInt(document.getElementById('col-diff-width')?.value) || 80,
      diffSegment: parseInt(document.getElementById('col-diff-segment-width')?.value) || 80,
      diffComplete: parseInt(document.getElementById('col-diff-complete-width')?.value) || 80,
      bestTotal: parseInt(document.getElementById('col-best-total-width')?.value) || 100,
      bestSegment: parseInt(document.getElementById('col-best-segment-width')?.value) || 100,
      bestComplete: parseInt(document.getElementById('col-best-complete-width')?.value) || 100
    };
    saveColumnWidths(widths);
    
    // Update display settings (font sizes, layout, visibility - NOT colors)
    const displaySettings = {
      rowHeightPreset: document.getElementById('row-height-preset')?.value || 'normal',
      rowHeight: parseInt(document.getElementById('row-height-value')?.value) || 36,
      paddingTop: parseInt(document.getElementById('row-padding-top')?.value) ?? 8,
      paddingBottom: parseInt(document.getElementById('row-padding-bottom')?.value) ?? 8,
      splitTableFontSize: parseInt(document.getElementById('split-table-font-size')?.value) || 14,
      totalTimerFontSize: parseInt(document.getElementById('total-timer-font-size')?.value) || 24,
      totalTimerBold: document.getElementById('total-timer-bold')?.checked || false,
      summaryFontSize: parseInt(document.getElementById('summary-font-size')?.value) || 16,
      globalFontFamily: document.getElementById('global-font-family')?.value || 'system-ui',
      showSumBest: document.getElementById('show-sum-best')?.checked ?? true,
      showBestComplete: document.getElementById('show-best-complete')?.checked ?? true
    };
    
    console.log('=== FONT FAMILY DEBUG ===');
    const fontFamilyElement = document.getElementById('global-font-family');
    const totalTimerBoldElement = document.getElementById('total-timer-bold');
    console.log('Font family element found:', !!fontFamilyElement);
    console.log('Total timer bold element found:', !!totalTimerBoldElement);
    console.log('Font family dropdown value:', fontFamilyElement?.value);
    console.log('Total timer bold checkbox value:', totalTimerBoldElement?.checked);
    console.log('Display settings globalFontFamily:', displaySettings.globalFontFamily);
    console.log('Display settings totalTimerBold:', displaySettings.totalTimerBold);
    console.log('Checkbox values - showSumBest:', document.getElementById('show-sum-best')?.checked, 'showBestComplete:', document.getElementById('show-best-complete')?.checked);
    console.log('Display settings:', displaySettings.showSumBest, displaySettings.showBestComplete);
    console.log('Complete display settings object:', displaySettings);
    saveDisplaySettings(displaySettings);
    
    // Update background color (saved in split file data, not global settings)
    backgroundColor = document.getElementById('background-color-hex')?.value || '#0e0f13';
    document.documentElement.style.setProperty('--bg', backgroundColor);
    
    // Update new color settings
    runTitleColor = document.getElementById('run-title-color-hex')?.value || '#c9d1d9';
    document.documentElement.style.setProperty('--run-title-color', runTitleColor);
    
    splitTableColor = document.getElementById('split-table-color-hex')?.value || '#c9d1d9';
    document.documentElement.style.setProperty('--split-table-color', splitTableColor);
    
    totalTimerTextColor = document.getElementById('total-timer-text-color-hex')?.value || '#8b9bb4';
    document.documentElement.style.setProperty('--total-timer-text-color', totalTimerTextColor);
    
    totalTimerDigitsColor = document.getElementById('total-timer-digits-color-hex')?.value || '#c9d1d9';
    document.documentElement.style.setProperty('--total-timer-digits-color', totalTimerDigitsColor);
    
    sumBestSegmentsColor = document.getElementById('sum-best-segments-color-hex')?.value || '#c9d1d9';
    document.documentElement.style.setProperty('--sum-best-segments-color', sumBestSegmentsColor);
    
    bestCompleteRunColor = document.getElementById('best-complete-run-color-hex')?.value || '#c9d1d9';
    document.documentElement.style.setProperty('--best-complete-run-color', bestCompleteRunColor);
    
    splitBg1Color = document.getElementById('split-bg-1-color-hex')?.value || '#0000000a';
    document.documentElement.style.setProperty('--split-bg-1', splitBg1Color);
    
    splitBg2Color = document.getElementById('split-bg-2-color-hex')?.value || '#00000015';
    document.documentElement.style.setProperty('--split-bg-2', splitBg2Color);
    
    // Apply changes immediately
    updateColumnVisibility();
    updateDisplaySettings();
  }
  fpBackdrop?.addEventListener('mousedown', (e) => { if (e.target === fpBackdrop) fpHide(); });

  // Option to reset saved values (PBs and settings)
  cfgResetStorage?.addEventListener('click', () => {
    const ok = window.confirm('Reset all saved values (PBs and settings)? This cannot be undone.');
    if (!ok) return;
    try {
      localStorage.removeItem(SAVE_PATH_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(GLOBAL_SETTINGS_KEY);
    } catch {}
    // Clear PBs in-memory
    bestTotals = new Array(splitNames.length).fill(0);
    bestSegments = new Array(splitNames.length).fill(0);
    bestCompleteSplits = new Array(splitNames.length).fill(0);
    // Clear global paths
    fpCurrentPath = null;
    imgCurrentPath = null;
    // Reset column visibility to defaults
    updateColumnVisibility();
    // Re-render to reflect cleared PBs
    doReset();
    renderRows();
  });

  // State
  let currentSplit = 0; // 0 means not started; 1..N indicates active split index (1-based)
  let startEpoch = 0;   // performance.now() when run started
  let lastAdvanceEpoch = 0; // timestamp of last split advance
  let finalTotalMs = 0;     // remembers the total time when last split finishes
  let paused = false;       // if true, timers are paused
  let totalElapsedAtPause = 0; // total elapsed time when paused
  // elapsed ms for each segment (split local time) and cumulative totals
  let segmentElapsed = new Array(splitNames.length).fill(0);
  let totalCumulative = new Array(splitNames.length).fill(0); // finalized totals per split; 0 if not reached yet

  // DOM
  const titleEl = document.getElementById('run-title');
  const iconEl = document.querySelector('.run-icon');
  const bodyEl = document.getElementById('splits-body');
  const totalEl = document.getElementById('total-timer');
  const bestCompleteEl = document.getElementById('best-complete');
  const sumBestSegsEl = document.getElementById('sum-best-segments');
  
  // Configuration icon elements
  const cfgIconPreview = document.getElementById('cfg-icon-preview');
  
  // Function to update icon display
  async function updateIconDisplay() {
    // Get fresh reference to icon element (it might have been recreated)
    const iconEl = document.querySelector('.run-icon');
    
    if (iconPath && iconPath.trim()) {
      try {
        // Use backend to read image as base64 data URL
        const iconUrl = await window.__TAURI__.core.invoke('read_image_as_base64', { path: iconPath });
        
        // Update main table icon
        if (iconEl) {
          iconEl.innerHTML = `<img src="${iconUrl}" alt="Run Icon" style="width: auto; height: 100%; object-fit: fill;">`;
        }
        
        // Update config preview icon
        if (cfgIconPreview) {
          cfgIconPreview.src = iconUrl;
          cfgIconPreview.style.display = 'inline-block';
        }
      } catch (error) {
        console.error('Failed to load icon:', error);
        // Fallback to default icon on error
        if (iconEl) {
          iconEl.textContent = '🏁';
        }
        if (cfgIconPreview) {
          cfgIconPreview.style.display = 'none';
          cfgIconPreview.src = '';
        }
      }
    } else {
      // Show default icon
      if (iconEl) {
        iconEl.textContent = '🏁';
      }
      
      // Hide config preview
      if (cfgIconPreview) {
        cfgIconPreview.style.display = 'none';
        cfgIconPreview.src = '';
      }
    }
  }
  
  // Click on icon preview to choose new icon
  cfgIconPreview?.addEventListener('click', async () => {
    console.log('Icon preview clicked');
    try {
      await showImageBrowser();
    } catch (error) {
      console.error('Failed to open image browser:', error);
    }
  });
  
  // Helper: any modal open (config or PB prompt)?
  function isModalOpen() {
    const el = document.querySelector('.modal-backdrop:not([hidden])');
    return !!el;
  }

  function pad(n, w=2) { return String(n).padStart(w, '0'); }
  function fmt(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '0.000';
    const t = Math.floor(ms);
    
    // If time is less than 60 seconds, show [seconds].[3 decimals]
    if (t < 60000) {
      const totalSeconds = ms / 1000;
      return totalSeconds.toFixed(3);
    }
    
    // If time is 60 seconds or more, show [minutes]:[seconds].[1 decimal]
    const m = Math.floor(t / 60000);
    const remainingMs = t % 60000;
    const totalSecondsInMinute = remainingMs / 1000;
    const s = Math.floor(totalSecondsInMinute);
    const decimal = Math.floor((remainingMs % 1000) / 100); // Get 1 decimal place
    
    return `${m}:${pad(s)}.${decimal}`;
  }
  
  // Special formatting for total timer - always shows 3 decimals
  function fmtTotal(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '0.000';
    const t = Math.floor(ms);
    
    // If time is less than 60 seconds, show [seconds].[3 decimals]
    if (t < 60000) {
      const totalSeconds = ms / 1000;
      return totalSeconds.toFixed(3);
    }
    
    // If time is 60 seconds or more, show [minutes]:[seconds].[3 decimals]
    const m = Math.floor(t / 60000);
    const remainingMs = t % 60000;
    const totalSecondsInMinute = remainingMs / 1000;
    const s = Math.floor(totalSecondsInMinute);
    const decimals = Math.floor((remainingMs % 1000));
    
    return `${m}:${pad(s)}.${pad(decimals, 3)}`;
  }

  // Build table rows
  function renderRows() {
    // Get fresh references to DOM elements (they might have been recreated)
    const titleEl = document.getElementById('run-title');
    const bodyEl = document.getElementById('splits-body');
    
    if (titleEl) titleEl.textContent = runTitle;
    updateIconDisplay();
    if (bodyEl) bodyEl.innerHTML = '';
    
    splitNames.forEach((name, i) => {
      const tr = document.createElement('tr');
      tr.className = 'row';
      tr.dataset.index = String(i);
      
      // Build icon display for split (non-clickable in main table) with placeholder
      tr.innerHTML = `
        <td class="name"><img src="spliticons/s_icon.png" class="split-icon-display" alt="Split icon"><span class="split-name">${name}</span></td>
        <td class="time total" id="tot-${i}">—</td>
        <td class="time current" id="seg-${i}">00:00.000</td>
        <td class="time diff" id="diff-total-${i}">—</td>
        <td class="time diff" id="diff-segment-${i}">—</td>
        <td class="time diff" id="diff-complete-${i}">—</td>
        <td class="time best" id="best-${i}">${bestTotals[i] ? fmt(bestTotals[i]) : '—'}</td>
        <td class="time bestseg" id="bestseg-${i}">—</td>
        <td class="time bestcomplete" id="bestcomplete-${i}">—</td>
      `;
      
      // Load actual icon asynchronously
      (async () => {
        const iconSrc = await getIconDisplaySrc(splitIcons[i]);
        const iconImg = tr.querySelector('.split-icon-display');
        if (iconImg) iconImg.src = iconSrc;
      })();
      
      if (bodyEl) bodyEl.appendChild(tr);
    });
    
    // Reapply active highlight based on currentSplit
    setActiveRow(currentSplit > 0 ? currentSplit - 1 : -1);
    
    // Apply column visibility and display settings
    updateColumnVisibility();
    updateDisplaySettings();
  }

  function setActiveRow(idx /* 0-based, -1 none */) {
    document.querySelectorAll('.row').forEach((r) => r.classList.remove('active'));
    if (idx >= 0) {
      const bodyEl = document.getElementById('splits-body');
      const row = bodyEl?.querySelector(`tr[data-index="${idx}"]`);
      if (row) row.classList.add('active');
    }
  }

  function totalElapsedNow(now) {
    if (currentSplit === 0) return 0;
    if (paused) return totalElapsedAtPause;
    const idx = currentSplit - 1;
    const prev = idx > 0 ? (totalCumulative[idx - 1] || 0) : 0;
    const seg = (segmentElapsed[idx] || 0) + (now - lastAdvanceEpoch);
    return prev + seg;
  }

  function updateDiff(i, cumulative, currentSegment) {
    // Only show for completed splits and currently active split
    const isCompleted = (currentSplit === 0 && (totalCumulative[i] || 0) > 0) || (i + 1 < currentSplit);
    const isCurrent = i + 1 === currentSplit;
    
    // Update Diff vs Best Total
    const diffTotalEl = document.getElementById(`diff-total-${i}`);
    if (diffTotalEl) {
      if (!isCompleted && !isCurrent) { 
        diffTotalEl.textContent = '—'; 
        diffTotalEl.classList.remove('positive','negative'); 
      } else {
        const best = bestTotals[i];
        if (!best) { 
          diffTotalEl.textContent = '—'; 
          diffTotalEl.classList.remove('positive','negative'); 
        } else {
          const delta = cumulative - best;
          const sign = delta === 0 ? '' : (delta > 0 ? '+' : '−');
          diffTotalEl.textContent = `${sign}${fmt(Math.abs(delta))}`;
          diffTotalEl.classList.toggle('positive', delta > 0);
          diffTotalEl.classList.toggle('negative', delta < 0);
        }
      }
    }
    
    // Update Diff vs Best This Segment
    const diffSegmentEl = document.getElementById(`diff-segment-${i}`);
    if (diffSegmentEl) {
      if (!isCompleted && !isCurrent) { 
        diffSegmentEl.textContent = '—'; 
        diffSegmentEl.classList.remove('positive','negative'); 
      } else {
        const bestSeg = bestSegments[i];
        if (!bestSeg) { 
          diffSegmentEl.textContent = '—'; 
          diffSegmentEl.classList.remove('positive','negative'); 
        } else {
          const delta = currentSegment - bestSeg;
          const sign = delta === 0 ? '' : (delta > 0 ? '+' : '−');
          diffSegmentEl.textContent = `${sign}${fmt(Math.abs(delta))}`;
          diffSegmentEl.classList.toggle('positive', delta > 0);
          diffSegmentEl.classList.toggle('negative', delta < 0);
        }
      }
    }
    
    // Update Diff vs Best Complete Run
    const diffCompleteEl = document.getElementById(`diff-complete-${i}`);
    if (diffCompleteEl) {
      if (!isCompleted && !isCurrent) { 
        diffCompleteEl.textContent = '—'; 
        diffCompleteEl.classList.remove('positive','negative'); 
      } else {
        const bestComplete = bestCompleteSplits[i];
        if (!bestComplete) { 
          diffCompleteEl.textContent = '—'; 
          diffCompleteEl.classList.remove('positive','negative'); 
        } else {
          const delta = cumulative - bestComplete;
          const sign = delta === 0 ? '' : (delta > 0 ? '+' : '−');
          diffCompleteEl.textContent = `${sign}${fmt(Math.abs(delta))}`;
          diffCompleteEl.classList.toggle('positive', delta > 0);
          diffCompleteEl.classList.toggle('negative', delta < 0);
        }
      }
    }
  }

  function tick() {
    const now = performance.now();

    // Update segment (This Segment) and totals per row
    let runningCumulative = 0;
    for (let i = 0; i < splitNames.length; i++) {
      const segEl = document.getElementById(`seg-${i}`);
      const totEl = document.getElementById(`tot-${i}`);
      if (!segEl || !totEl) continue; // DOM not yet updated; skip this iteration
      let seg = segmentElapsed[i];
  if (currentSplit !== 0 && i + 1 === currentSplit && !paused) {
        seg += now - lastAdvanceEpoch;
      }
      segEl.textContent = i + 1 === currentSplit || segmentElapsed[i] > 0 ? fmt(seg) : '00:00.000';

  const tot = i + 1 < currentSplit
        ? (totalCumulative[i] || 0)
        : (i + 1 === currentSplit ? runningCumulative + seg : (totalCumulative[i] || 0));

      if (tot > 0) totEl.textContent = fmt(tot); else totEl.textContent = '—';
      runningCumulative = tot > 0 ? tot : runningCumulative;
  // Update bests display
  const bestTotEl = document.getElementById(`best-${i}`);
  if (bestTotEl) bestTotEl.textContent = bestTotals[i] ? fmt(bestTotals[i]) : '—';
  const bestSegEl = document.getElementById(`bestseg-${i}`);
  if (bestSegEl) bestSegEl.textContent = bestSegments[i] ? fmt(bestSegments[i]) : '—';
  const bestCompEl = document.getElementById(`bestcomplete-${i}`);
  if (bestCompEl) bestCompEl.textContent = bestCompleteSplits[i] ? fmt(bestCompleteSplits[i]) : '—';

  updateDiff(i, tot || runningCumulative, seg);
    }

    // If run has ended, show remembered total; else live total
    const totalEl = document.getElementById('total-timer');
    if (currentSplit === 0 && finalTotalMs > 0) {
      if (totalEl) totalEl.textContent = fmtTotal(finalTotalMs);
    } else {
      if (totalEl) totalEl.textContent = fmtTotal(totalElapsedNow(now));
    }
    // Footer values
    const bestCompleteEl = document.getElementById('best-complete');
    const sumBestSegsEl = document.getElementById('sum-best-segments');
    const bestCompleteTotal = bestCompleteSplits?.[splitNames.length - 1] || 0;
    if (bestCompleteEl) bestCompleteEl.textContent = bestCompleteTotal ? fmt(bestCompleteTotal) : '—';
    const sumBestSegs = (bestSegments || []).slice(0, splitNames.length).reduce((a, b) => a + (b || 0), 0);
    if (sumBestSegsEl) sumBestSegsEl.textContent = sumBestSegs ? fmt(sumBestSegs) : '—';
  }

  function startRunIfNeeded() {
  // If run already finished (finalTotalMs > 0), block until reset
  if (finalTotalMs > 0) return;
  if (currentSplit === 0) {
      startEpoch = performance.now();
      lastAdvanceEpoch = startEpoch;
      currentSplit = 1; // move to first split
      setActiveRow(0);
    }
  }

  function advanceSplit() {
  const now = performance.now();
  if (paused) return; // do nothing while paused
    if (currentSplit === 0) {
      // starting the run by advancing to Split 1
      startRunIfNeeded();
      return;
    }
  const idx = currentSplit - 1;
  // finalize current segment time and cumulative
  segmentElapsed[idx] += now - lastAdvanceEpoch;
  const prevCum = idx > 0 ? (totalCumulative[idx - 1] || 0) : 0;
  totalCumulative[idx] = prevCum + segmentElapsed[idx];

  if (currentSplit < splitNames.length) {
      // advance to next split
      currentSplit += 1;
      lastAdvanceEpoch = now;
      setActiveRow(currentSplit - 1);
    } else {
      // last split completed -> stop (set currentSplit to 0 means stopped)
      // Use finalized cumulative total of the last split to avoid double-counting live segment
      finalTotalMs = totalCumulative[totalCumulative.length - 1] || 0;
      
      // Increment runs completed counter
      runsCompleted++;
      updateRunStats();
      
      currentSplit = 0;
      lastAdvanceEpoch = 0;
      setActiveRow(-1);
    }
  }

  function unsplit() {
    if (currentSplit <= 1 || paused) return; // cannot unsplit if on first split or earlier, or if paused
    
    const idx = currentSplit - 1; // current split index (0-based)
    
    // Go back to previous split
    currentSplit -= 1;
    
    // Clear the data for the split we're backing out of
    segmentElapsed[idx] = 0;
    totalCumulative[idx] = 0;
    
    // Update visual indicator
    setActiveRow(currentSplit - 1);
    
    // DO NOT touch lastAdvanceEpoch or any other timing variables
    // The timer will continue naturally from where it was
    
    console.log(`Unsplit: returned to split ${currentSplit}`);
  }

  function resetRun() {
    // On reset, if we have completed any splits, ask to save PBs
    const completed = totalCumulative.findIndex((v, i) => v === 0 && i < splitNames.length - 1) === -1
      ? totalCumulative.filter((v) => v > 0).length
      : totalCumulative.filter((v) => v > 0).length;
    const anyCompleted = completed > 0 || finalTotalMs > 0;
    if (anyCompleted) {
      // Simple modal prompt using the existing config backdrop styling
      const confirm = document.createElement('div');
      confirm.className = 'modal-backdrop';
      confirm.innerHTML = `
        <div class="modal">
          <header><h3>Save Personal Bests?</h3></header>
          <section>
            <p>Do you want to save completed splits as personal bests and compare next runs?</p>
            <div class="cfg-actions">
              <button id="pb-no">No</button>
              <button id="pb-yes">Yes</button>
            </div>
          </section>
        </div>`;
      document.body.appendChild(confirm);
  const done = (save) => {
        if (save) {
          // Increment runs started counter when user chooses to save PBs
          runsStarted++;
          updateRunStats();
          
          // Update PBs for each reached split
          for (let i = 0; i < splitNames.length; i++) {
            const tot = totalCumulative[i] || 0;
            const seg = segmentElapsed[i] || 0;
    const completed = tot > 0; // only finalized splits have a cumulative total stored
    if (completed && (bestTotals[i] === 0 || tot < bestTotals[i])) bestTotals[i] = tot;
    // Do NOT save Best This Segment for an in-progress split
    if (completed && seg > 0 && (bestSegments[i] === 0 || seg < bestSegments[i])) bestSegments[i] = seg;
          }
          // If full run completed, update best complete run splits when improved
          const final = totalCumulative[splitNames.length - 1] || 0;
          if (final > 0) {
            const prevBest = bestCompleteSplits?.[splitNames.length - 1] || 0;
            if (prevBest === 0 || final < prevBest) {
              bestCompleteSplits = totalCumulative.slice(0, splitNames.length);
            }
          }
          // Get current column widths to include in save
          const currentWidths = getColumnWidths();
          // Persist runTitle, splitNames, and PBs
          saveState({ 
            runTitle, iconPath, splitNames, splitIcons, bestTotals, bestSegments, bestCompleteSplits, 
            columnWidths: currentWidths, backgroundColor, runTitleColor, splitTableColor, 
            totalTimerTextColor, totalTimerDigitsColor, sumBestSegmentsColor, bestCompleteRunColor, 
            splitBg1Color, splitBg2Color,
            showSumBest: document.getElementById('show-sum-best')?.checked ?? true,
            showBestComplete: document.getElementById('show-best-complete')?.checked ?? true,
            runsStarted, runsCompleted
          });
        }
        document.body.removeChild(confirm);
        // proceed to actual reset after decision
        doReset();
      };
      confirm.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.id === 'pb-yes') done(true);
        if (t.id === 'pb-no') done(false);
      });
      return; // wait for user decision
    }
    // No completed splits, user is starting fresh - count as started run
    runsStarted++;
    updateRunStats();
    doReset();
  }
  
  // Function to save personal bests without showing modal (for hotkeys)
  function savePersonalBests() {
    // Increment runs started counter when saving PBs via hotkey
    runsStarted++;
    updateRunStats();
    
    // Update PBs for each reached split
    for (let i = 0; i < splitNames.length; i++) {
      const tot = totalCumulative[i] || 0;
      const seg = segmentElapsed[i] || 0;
      const completed = tot > 0; // only finalized splits have a cumulative total stored
      if (completed && (bestTotals[i] === 0 || tot < bestTotals[i])) bestTotals[i] = tot;
      // Do NOT save Best This Segment for an in-progress split
      if (completed && seg > 0 && (bestSegments[i] === 0 || seg < bestSegments[i])) bestSegments[i] = seg;
    }
    // If full run completed, update best complete run splits when improved
    const final = totalCumulative[splitNames.length - 1] || 0;
    if (final > 0) {
      const prevBest = bestCompleteSplits?.[splitNames.length - 1] || 0;
      if (prevBest === 0 || final < prevBest) {
        bestCompleteSplits = totalCumulative.slice(0, splitNames.length);
      }
    }
    // Get current column widths to include in save
    const currentWidths = getColumnWidths();
    // Persist runTitle, splitNames, and PBs
    saveState({ 
      runTitle, iconPath, splitNames, splitIcons, bestTotals, bestSegments, bestCompleteSplits, 
      columnWidths: currentWidths, backgroundColor, runTitleColor, splitTableColor, 
      totalTimerTextColor, totalTimerDigitsColor, sumBestSegmentsColor, bestCompleteRunColor, 
      splitBg1Color, splitBg2Color,
      showSumBest: document.getElementById('show-sum-best')?.checked ?? true,
      showBestComplete: document.getElementById('show-best-complete')?.checked ?? true,
      runsStarted, runsCompleted
    });
  }

  function doReset() {
    currentSplit = 0;
    startEpoch = 0;
    lastAdvanceEpoch = 0;
    segmentElapsed = new Array(splitNames.length).fill(0);
    totalCumulative = new Array(splitNames.length).fill(0);
    finalTotalMs = 0;
    paused = false;
    totalElapsedAtPause = 0;
    setActiveRow(-1);
    tick();
  }

  function updateRunStats() {
    const runStatsElement = document.getElementById('run-stats');
    if (runStatsElement) {
      runStatsElement.textContent = `${runsStarted}/${runsCompleted}`;
    }
  }

  async function saveTimesToFile() {
    console.log('saveTimesToFile called');
    let filePath = loadSavePath();
    console.log('Current save path:', filePath);
    
    const payload = {
      runTitle,
      iconPath,
      splitNames,
      splitIcons,
      backgroundColor,
      runTitleColor,
      splitTableColor,
      totalTimerTextColor,
      totalTimerDigitsColor,
      sumBestSegmentsColor,
      bestCompleteRunColor,
      splitBg1Color,
      splitBg2Color,
      bestTotals,
      bestSegments,
      bestCompleteSplits,
      columnWidths: getColumnWidths(),
      displaySettings: getDisplaySettings(),
      runsStarted,
      runsCompleted,
      savedAt: new Date().toISOString()
    };
    
    try {
      const dataStr = JSON.stringify(payload, null, 2);
      console.log('About to write file:', filePath);
      console.log('Data to write:', dataStr.substring(0, 100) + '...');
      
      // Check if we have a stored file handle from File System Access API
      if (window.selectedFileHandle) {
        try {
          console.log('Using stored File System Access API handle');
          const writable = await window.selectedFileHandle.createWritable();
          await writable.write(dataStr);
          await writable.close();
          console.log('File saved using stored file handle');
          return;
        } catch (handleError) {
          console.log('Stored file handle failed:', handleError);
          window.selectedFileHandle = null; // Clear invalid handle
        }
      }
      
      // Check if Tauri is available
      if (window.__TAURI__?.core?.invoke) {
        console.log('Using Tauri backend for file operations');
        try {
          // Try backend invoke commands first
          await window.__TAURI__.core.invoke('make_parent_dirs', { path: filePath });
          await window.__TAURI__.core.invoke('write_text_file', { path: filePath, contents: dataStr });
          console.log('File written using backend invoke');
        } catch (invokeError) {
          console.log('Backend invoke failed, trying Tauri FS API:', invokeError);
          // Fallback to Tauri FS API
          try {
            const { writeTextFile } = await import('@tauri-apps/api/fs');
            await writeTextFile(filePath, dataStr);
            console.log('File written using Tauri FS API');
          } catch (fsError) {
            console.log('Tauri FS API also failed:', fsError);
            throw fsError;
          }
        }
      } else {
        // Try modern File System Access API first (for supported browsers)
        if ('showSaveFilePicker' in window) {
          try {
            console.log('Using File System Access API');
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: filePath.split('/').pop() || 'splits.json',
              types: [{
                description: 'JSON files',
                accept: { 'application/json': ['.json'] }
              }]
            });
            const writable = await fileHandle.createWritable();
            await writable.write(dataStr);
            await writable.close();
            console.log('File saved using File System Access API');
            return;
          } catch (fsAccessError) {
            console.log('File System Access API failed or cancelled:', fsAccessError);
          }
        }
        
        // If no file path and no stored handle, prompt for save location
        if (!filePath) {
          // Try File System Access API for new file selection
          if ('showSaveFilePicker' in window) {
            try {
              console.log('No file path, using File System Access API for Save As');
              const fileHandle = await window.showSaveFilePicker({
                suggestedName: 'splits.json',
                types: [{
                  description: 'JSON files',
                  accept: { 'application/json': ['.json'] }
                }]
              });
              window.selectedFileHandle = fileHandle;
              const writable = await fileHandle.createWritable();
              await writable.write(dataStr);
              await writable.close();
              console.log('File saved using File System Access API Save As');
              return;
            } catch (saveAsError) {
              console.log('File System Access API Save As cancelled:', saveAsError);
              return;
            }
          } else {
            // Fallback prompt
            filePath = prompt('Enter the full path where you want to save splits:', '/home/user/splits.json');
            if (!filePath) return;
            saveSavePath(filePath);
          }
        }
        
        // Fallback: download as file in browser
        console.log('Using browser download fallback');
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath.split('/').pop() || 'splits.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('File downloaded to Downloads folder. You may need to move it to:', filePath);
      }
      console.log('File saved successfully!');
    } catch (e) {
      console.error('Save failed:', e);
      console.log('Failed to save file: ' + (e?.message || e));
    }
  }

  // Context menu (custom)
  function buildContextMenu() {
    console.log('Building context menu...');
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.innerHTML = `
      <button data-action="start">Start / Split</button>
      <button data-action="stop">Stop</button>
      <button data-action="reset">Reset</button>
      <hr />
      <button data-action="save-times">Save Times</button>
      <hr />
      <button data-action="config">Configuration…</button>
    `;
    document.body.appendChild(menu);

    function hide() { menu.style.display = 'none'; }
    function show(x, y) {
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      menu.style.display = 'block';
    }
    window.addEventListener('click', hide);
    window.addEventListener('blur', hide);
    window.addEventListener('contextmenu', (e) => {
      console.log('Right click detected!');
      e.preventDefault();
      show(e.clientX, e.clientY);
    });
    menu.addEventListener('click', async (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      if (!action) return;
      hide();
      switch (action) {
        case 'start':
          if (paused) {
            // resume
            const now = performance.now();
            lastAdvanceEpoch = now; // restart ticking from now
            paused = false;
          } else if (currentSplit === 0) {
            startRunIfNeeded();
          } else {
            advanceSplit();
          }
          break;
        case 'stop':
          if (currentSplit !== 0 && !paused) {
            // freeze the running split by accumulating elapsed into segmentElapsed
            const now = performance.now();
            const idx = currentSplit - 1;
            segmentElapsed[idx] += now - lastAdvanceEpoch;
            lastAdvanceEpoch = now; // not strictly needed while paused
            paused = true;
          }
          break;
        case 'save-times':
          await saveTimesToFile();
          break;
        case 'reset':
          resetRun();
          break;
        case 'config':
      openConfig();
          break;
      }
    });
  }

  // Keyboard: Backspace advances split
  window.addEventListener('keydown', (e) => {
    // Block hotkeys when config is open
    if (isModalOpen()) {
      if (e.key === 'Escape') closeConfig();
      return;
    }
    // Note: Backspace is now handled exclusively by global shortcuts system
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') { // Ctrl+R to reset (dev helper)
      e.preventDefault();
      resetRun();
    }
  });

  // Setup global shortcuts for Tauri using device_query polling approach
  async function setupGlobalShortcuts() {
    console.log('setupGlobalShortcuts called - using device_query polling');
    
    // Track window focus state
    let windowHasFocus = document.hasFocus();
    
    window.addEventListener('focus', () => {
      windowHasFocus = true;
      console.log('Window gained focus - global shortcuts disabled');
    });
    
    window.addEventListener('blur', () => {
      windowHasFocus = false;
      console.log('Window lost focus - global shortcuts enabled');
    });
    
    try {
      if (window.__TAURI__?.core?.invoke) {
        console.log('Starting global key polling...');
        
        // Set up periodic polling for global key presses
        setInterval(async () => {
          try {
            // Process global keys regardless of window focus state
            const newKeys = await window.__TAURI__.core.invoke('check_global_keys');
            
            // Check for any configured hotkeys
            const hotkeys = getHotkeySettings();
            for (const [action, key] of Object.entries(hotkeys)) {
              if (key && newKeys.includes(key)) {
                console.log(`Global hotkey detected: ${key} for action: ${action}`);
                handleHotkeyAction(action);
              }
            }
          } catch (error) {
            // Silently ignore polling errors to avoid spam
            // console.log('Key polling error:', error);
          }
        }, 16); // ~60fps polling rate like Flitter
        
        console.log('Global key polling setup complete');
      } else {
        console.log('Tauri core.invoke not available');
      }
    } catch (error) {
      console.log('Global shortcuts setup failed:', error);
    }
  }

  // Hotkey action handler function
  function handleHotkeyAction(action) {
    console.log(`Hotkey action triggered: ${action}`);
    
    switch (action) {
      case 'start-split':
        // Execute the same logic as the old Backspace handler
        if (paused) {
          // resume
          const now = performance.now();
          lastAdvanceEpoch = now;
          paused = false;
          totalElapsedAtPause = 0; // Clear the paused total when resuming
          console.log('Timer resumed via start-split hotkey');
        } else if (currentSplit === 0) {
          startRunIfNeeded();
          console.log('Timer started via start-split hotkey');
        } else {
          advanceSplit();
          console.log('Split advanced via start-split hotkey');
        }
        break;
        
      case 'stop':
        if (!paused && currentSplit > 0) {
          // Save the current elapsed time for this segment before pausing
          const now = performance.now();
          const segmentIndex = currentSplit - 1; // Convert to 0-based index
          const runningTime = now - lastAdvanceEpoch;
          
          // Calculate total elapsed time including the current running time
          const prev = segmentIndex > 0 ? (totalCumulative[segmentIndex - 1] || 0) : 0;
          const currentSegmentTime = (segmentElapsed[segmentIndex] || 0) + runningTime;
          totalElapsedAtPause = prev + currentSegmentTime;
          
          // Now update the segment elapsed time
          if (segmentIndex < segmentElapsed.length) {
            segmentElapsed[segmentIndex] += runningTime;
          }
          paused = true;
          console.log('Timer stopped via stop hotkey');
        } else if (paused) {
          // If already paused, this acts as resume (like start-split)
          const now = performance.now();
          lastAdvanceEpoch = now;
          paused = false;
          totalElapsedAtPause = 0;
          console.log('Timer resumed via stop hotkey (acting as resume)');
        }
        break;
        
      case 'reset-save':
        if (currentSplit >= 0 || paused) {
          // Perform reset and save PBs immediately without modal
          savePersonalBests();
          doReset();
          console.log('Timer reset with save via reset-save hotkey');
        }
        break;
        
      case 'reset-no-save':
        if (currentSplit >= 0 || paused) {
          // Perform reset without saving PBs
          doReset();
          console.log('Timer reset without save via reset-no-save hotkey');
        }
        break;
        
      case 'unsplit':
        if (currentSplit > 1 && !paused) {
          unsplit();
          console.log('Unsplit performed via unsplit hotkey');
        }
        break;
        
      default:
        console.log(`Unknown hotkey action: ${action}`);
    }
  }

  // Set up global shortcut monitoring (polling-based, no event listeners needed)
  function setupGlobalShortcutEventListeners() {
    console.log('Using polling-based global shortcuts with focus detection');
    console.log('Global shortcut monitoring ready');
  }

  // Init
  console.log('Initializing app components...');
  
  // Always show welcome screen on startup
  console.log('Showing welcome screen on startup');
  showWelcomeScreen();
  
  setupGlobalShortcuts(); // Setup global shortcuts
  console.log('Context menu built, starting timer...');
  const id = setInterval(tick, 50); // ~20 Hz is enough for readability
  window.addEventListener('beforeunload', () => clearInterval(id));
  console.log('App initialization complete!');

  // ============ ICON SELECTOR FUNCTIONS ============
  
  let currentIconSplitIndex = -1;
  let selectedIconPath = '';
  let availableIcons = [];

  // Open icon selector modal for a specific split
  window.openIconSelector = function(splitIndex) {
    console.log('openIconSelector called for split index:', splitIndex);
    console.log('Current splitIcons array:', splitIcons);
    console.log('splitIcons length:', splitIcons.length);
    currentIconSplitIndex = splitIndex;
    selectedIconPath = '';
    loadAvailableIcons();
    showIconSelector();
  };

  // Load all available icons from default folder and custom additions
  async function loadAvailableIcons() {
    availableIcons = [];
    
    // Load default icons from spliticons/
    const defaultIcons = [
      'apple1.png', 'apple2.png', 'arrow1.png', 'arrow2.png', 'arrow3.png', 'banana1.png', 'banana2.png', 'bomb.png', 'book1.png', 'book2.png', 'box.png', 'boy1.png', 'boy2.png', 'bzzt.png', 'car1.png', 'car2.png', 'car3.png', 'cat.png', 'check1.png', 'check2.png', 'check3.png',
      'cross1.png', 'cross2.png', 'cross3.png', 'crown.png', 'egg.png', 'explosion.png', 'evil1.png', 'evil2.png',
      'eye1.png', 'factory.png', 'finish.png', 'flag1.png', 'flag2.png', 'flag3.png', 'flag4.png', 'flag5.png', 'gear.png', 'gem.png', 'house1.png', 'ok.png', 'skull.png', 'stairs.png', 's_icon.png', 'star1.png', 'star2.png', 'star3.png', 'sun1.png', 'sword1.png', 'sword2.png', 'tomato.png', 'town1.png', 'town2.png'
    ];
    
    for (const icon of defaultIcons) {
      availableIcons.push({
        path: `spliticons/${icon}`,
        name: icon.replace('.png', ''),
        isCustom: false
      });
    }
    
    // Load custom icons from localStorage if any
    const customIcons = getCustomIcons();
    availableIcons.push(...customIcons);
    
    renderIconGallery();
  }

  // Get custom icons from localStorage
  function getCustomIcons() {
    try {
      const custom = localStorage.getItem('speedrun_splitter_custom_icons');
      return custom ? JSON.parse(custom) : [];
    } catch {
      return [];
    }
  }

  // Save custom icons to localStorage
  function saveCustomIcons(icons) {
    try {
      localStorage.setItem('speedrun_splitter_custom_icons', JSON.stringify(icons));
    } catch {}
  }

  // Render the icon gallery
  async function renderIconGallery() {
    const gallery = document.getElementById('icon-gallery');
    if (!gallery) return;
    
    gallery.innerHTML = '';
    
    for (let index = 0; index < availableIcons.length; index++) {
      const icon = availableIcons[index];
      const iconDiv = document.createElement('div');
      iconDiv.className = 'icon-item';
      iconDiv.dataset.index = index;
      
      // Use placeholder initially
      iconDiv.innerHTML = `
        <img src="spliticons/star1.png" alt="${icon.name}" class="gallery-icon">
        <span class="icon-name">${icon.name}</span>
        ${icon.isCustom ? '<span class="custom-badge">Custom</span>' : ''}
      `;
      
      // Load actual icon asynchronously
      (async () => {
        try {
          const iconSrc = await getIconDisplaySrc(icon.path);
          const imgEl = iconDiv.querySelector('.gallery-icon');
          if (imgEl) imgEl.src = iconSrc;
        } catch (error) {
          console.log('Failed to load gallery icon:', icon.path);
        }
      })();
      
      iconDiv.addEventListener('click', () => selectIcon(index));
      gallery.appendChild(iconDiv);
    }
  }

  // Select an icon from the gallery
  function selectIcon(index) {
    // Remove previous selection
    document.querySelectorAll('.icon-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    const iconItem = document.querySelector(`.icon-item[data-index="${index}"]`);
    if (iconItem) {
      iconItem.classList.add('selected');
      selectedIconPath = availableIcons[index].path;
      
      // Enable select button
      const selectBtn = document.getElementById('icon-select');
      const removeBtn = document.getElementById('icon-remove-selected');
      if (selectBtn) selectBtn.disabled = false;
      if (removeBtn) removeBtn.disabled = !availableIcons[index].isCustom;
    }
  }

  // Show the icon selector modal
  function showIconSelector() {
    const modal = document.getElementById('icon-selector-modal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // Reset selection state
      document.getElementById('icon-select').disabled = true;
      document.getElementById('icon-remove-selected').disabled = true;
    }
  }

  // Hide the icon selector modal
  function hideIconSelector() {
    const modal = document.getElementById('icon-selector-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // Apply selected icon to split
  function applySelectedIcon() {
    if (currentIconSplitIndex >= 0 && selectedIconPath) {
      // Ensure splitIcons array has enough elements
      while (splitIcons.length <= currentIconSplitIndex) {
        splitIcons.push('');
      }
      
      splitIcons[currentIconSplitIndex] = selectedIconPath;
      console.log('Applied icon to split', currentIconSplitIndex, ':', selectedIconPath);
      console.log('Current splitIcons array:', splitIcons);
      
      renderRows(); // Re-render main table to show new icon
      
      // Also update configuration table if it's open
      if (cfgSplitsTbody && cfgSplitsTbody.children.length > 0) {
        console.log('Setting cfgCount from applySelectedIcon:', splitNames.length);
        cfgCount.value = String(splitNames.length);
        // Gather current split names from input fields to preserve them
        const currentNames = Array.from(cfgSplitsTbody.querySelectorAll('input')).map(input => input.value);
        cfgRenderRows(splitNames.length, currentNames);
      }
      
      // Save to localStorage for persistence between sessions
      saveState({ 
        runTitle, iconPath, splitNames, splitIcons, bestTotals, bestSegments, bestCompleteSplits, 
        backgroundColor, runTitleColor, splitTableColor, totalTimerTextColor, totalTimerDigitsColor, 
        sumBestSegmentsColor, bestCompleteRunColor, splitBg1Color, splitBg2Color,
        showSumBest: document.getElementById('show-sum-best')?.checked ?? true,
        showBestComplete: document.getElementById('show-best-complete')?.checked ?? true,
        runsStarted, runsCompleted
      });
      
      hideIconSelector();
    }
  }

  // Add custom icon via file browser
  function addCustomIcon() {
    console.log('addCustomIcon called');
    showIconFileBrowser();
  }

  // Show file browser specifically for icon selection
  async function showIconFileBrowser() {
    const modal = document.createElement('div');
    modal.className = 'file-browser-modal';
    modal.innerHTML = `
      <div class="file-browser-content">
        <div class="file-browser-header">
          <h3>Choose Icon File</h3>
          <button class="close-btn" onclick="this.closest('.file-browser-modal').remove()">×</button>
        </div>
        <div class="file-browser-path">
          <button id="iconFbHome">🏠</button>
          <button id="iconFbUp">⬆️</button>
          <span id="iconFbPath">/</span>
        </div>
        <div class="file-browser-list" id="iconFbList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
          Loading...
        </div>
        <div class="file-browser-input">
          <button id="iconFbCancel">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentPath = '/';
    
    // Try to get home directory as starting point
    try {
      currentPath = await window.__TAURI__.core.invoke('home_dir');
    } catch (error) {
      console.error('Failed to get home directory:', error);
    }
    
    const pathEl = document.getElementById('iconFbPath');
    const listEl = document.getElementById('iconFbList');
    const homeBtn = document.getElementById('iconFbHome');
    const upBtn = document.getElementById('iconFbUp');
    const cancelBtn = document.getElementById('iconFbCancel');
    
    async function loadIconDirectory(path) {
      if (!pathEl || !listEl) return;
      
      pathEl.textContent = path;
      listEl.innerHTML = 'Loading...';
      
      try {
        const entries = await window.__TAURI__.core.invoke('list_dir', { path });
        listEl.innerHTML = '';
        
        // Filter for image files and directories
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'];
        const filteredEntries = entries.filter(entry => {
          if (entry.is_dir) return true;
          const ext = entry.name.toLowerCase().split('.').pop();
          return imageExtensions.includes('.' + ext);
        });
        
        if (filteredEntries.length === 0) {
          listEl.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #888;">No image files found in this directory</div>';
          return;
        }
        
        filteredEntries.forEach(entry => {
          const item = document.createElement('div');
          item.className = 'icon-file-item';
          item.style.cssText = `
            padding: 8px;
            border: 1px solid #444;
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
            background: #2a2a2a;
            transition: all 0.2s ease;
          `;
          
          if (entry.is_dir) {
            item.innerHTML = `
              <div style="font-size: 24px; margin-bottom: 4px;">📁</div>
              <div style="font-size: 12px; word-break: break-word;">${entry.name}</div>
            `;
            item.addEventListener('click', () => {
              currentPath = currentPath.endsWith('/') ? currentPath + entry.name : currentPath + '/' + entry.name;
              loadIconDirectory(currentPath);
            });
          } else {
            const fullPath = currentPath.endsWith('/') ? currentPath + entry.name : currentPath + '/' + entry.name;
            item.innerHTML = `
              <div style="width: 64px; height: 64px; margin: 0 auto 4px; background: #1a1a1a; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <div style="font-size: 20px;" class="loading-placeholder">🖼️</div>
              </div>
              <div style="font-size: 11px; word-break: break-word;">${entry.name}</div>
            `;
            
            // Load thumbnail asynchronously
            (async () => {
              try {
                const base64Data = await window.__TAURI__.core.invoke('read_image_as_base64', { path: fullPath });
                const placeholder = item.querySelector('.loading-placeholder');
                if (placeholder) {
                  placeholder.outerHTML = `<img src="${base64Data}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Thumbnail">`;
                }
              } catch (error) {
                console.log('Failed to load thumbnail for:', entry.name);
                // Keep the placeholder icon
              }
            })();
            
            item.addEventListener('click', () => selectIconFile(fullPath, entry.name));
          }
          
          item.addEventListener('mouseenter', () => {
            item.style.borderColor = '#666';
            item.style.background = '#333';
          });
          item.addEventListener('mouseleave', () => {
            item.style.borderColor = '#444';
            item.style.background = '#2a2a2a';
          });
          
          listEl.appendChild(item);
        });
        
      } catch (error) {
        console.error('Failed to load directory:', error);
        listEl.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #f44;">Error loading directory</div>';
      }
    }
    
    function selectIconFile(filePath, fileName) {
      console.log('Selected icon file:', filePath);
      
      // Add to custom icons
      const customIcons = getCustomIcons();
      
      // Check if icon already exists
      const existingIcon = customIcons.find(icon => icon.path === filePath);
      if (!existingIcon) {
        customIcons.push({
          path: filePath,
          name: fileName.replace(/\.[^/.]+$/, ''),
          isCustom: true
        });
        saveCustomIcons(customIcons);
        
        // Reload gallery
        loadAvailableIcons();
        console.log('Custom icon added:', fileName);
      } else {
        console.log('Icon already exists');
      }
      
      // Close the file browser
      modal.remove();
    }
    
    // Event listeners
    homeBtn?.addEventListener('click', async () => {
      try {
        currentPath = await window.__TAURI__.core.invoke('home_dir');
        loadIconDirectory(currentPath);
      } catch (error) {
        console.error('Failed to get home directory:', error);
      }
    });
    
    upBtn?.addEventListener('click', () => {
      const lastSlash = currentPath.lastIndexOf('/');
      if (lastSlash > 0) {
        currentPath = currentPath.substring(0, lastSlash);
      } else {
        currentPath = '/';
      }
      loadIconDirectory(currentPath);
    });
    
    cancelBtn?.addEventListener('click', () => {
      modal.remove();
    });
    
    // Load initial directory
    loadIconDirectory(currentPath);
  }

  // Remove selected custom icon
  function removeSelectedIcon() {
    if (selectedIconPath) {
      const customIcons = getCustomIcons();
      const updatedIcons = customIcons.filter(icon => icon.path !== selectedIconPath);
      saveCustomIcons(updatedIcons);
      loadAvailableIcons();
    }
  }

  // Event listeners for icon selector
  document.getElementById('icon-close')?.addEventListener('click', hideIconSelector);
  document.getElementById('icon-cancel')?.addEventListener('click', hideIconSelector);
  document.getElementById('icon-select')?.addEventListener('click', applySelectedIcon);
  document.getElementById('icon-add-custom')?.addEventListener('click', addCustomIcon);
  document.getElementById('icon-remove-selected')?.addEventListener('click', removeSelectedIcon);

  // Close modal when clicking outside
  document.getElementById('icon-selector-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'icon-selector-modal') {
      hideIconSelector();
    }
  });
  
  } // end initApp
})();
