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
  let splitNames = ['Split 1', 'Split 2', 'Split 3'];
  
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
    return globalSettings.displaySettings || {
      rowHeightPreset: 'normal',
      rowHeight: 36,
      paddingTop: 8,
      paddingBottom: 8,
      totalTimerFont: 'large',
      summaryFont: 'normal',
      showSumBest: true,
      showBestComplete: true
    };
  }
  
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
    const globalSettings = loadGlobalSettings();
    globalSettings.displaySettings = settings;
    saveGlobalSettings(globalSettings);
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
      bestTotal: 4,
      bestSegment: 5,
      bestComplete: 6
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
      bestTotal: 4,
      bestSegment: 5,
      bestComplete: 6
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
    }
    
    // Update font sizes
    body.className = body.className.replace(/total-timer-\w+/g, '');
    body.classList.add(`total-timer-${settings.totalTimerFont}`);
    
    body.className = body.className.replace(/summary-font-\w+/g, '');
    body.classList.add(`summary-font-${settings.summaryFont}`);
    
    // Update summary visibility
    const summaryTable = document.querySelector('.summary-table');
    if (summaryTable) {
      const sumBestRow = Array.from(summaryTable.querySelectorAll('tr')).find(row => 
        row.textContent.includes('Sum of Best Segments')
      );
      const bestCompleteRow = Array.from(summaryTable.querySelectorAll('tr')).find(row => 
        row.textContent.includes('Best Complete Run')
      );
      
      if (sumBestRow) {
        sumBestRow.style.display = settings.showSumBest ? '' : 'none';
      }
      if (bestCompleteRow) {
        bestCompleteRow.style.display = settings.showBestComplete ? '' : 'none';
      }
    }
  }
  
  function renderRecentFiles() {
    const container = document.getElementById('recent-files-container');
    if (!container) return;
    
    container.innerHTML = '';
    const recentFiles = getRecentFiles();
    
    if (recentFiles.length === 0) return;
    
    recentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop() || filePath;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'recent-file-btn';
      button.textContent = fileName;
      button.title = filePath; // Show full path on hover
      button.addEventListener('click', async () => {
        await loadSaveFile(filePath);
        closeConfig();
      });
      container.appendChild(button);
    });
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
        if (cfgCount) cfgCount.value = String(splitNames.length);
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
      }
      
      // Load column widths if present
      if (data.columnWidths && typeof data.columnWidths === 'object') {
        // Update the configuration form with loaded widths
        const widths = data.columnWidths;
        if (document.getElementById('col-split-width')) document.getElementById('col-split-width').value = widths.split || 150;
        if (document.getElementById('col-total-width')) document.getElementById('col-total-width').value = widths.total || 100;
        if (document.getElementById('col-segment-width')) document.getElementById('col-segment-width').value = widths.segment || 100;
        if (document.getElementById('col-diff-width')) document.getElementById('col-diff-width').value = widths.diff || 80;
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
        if (document.getElementById('total-timer-font')) document.getElementById('total-timer-font').value = settings.totalTimerFont || 'large';
        if (document.getElementById('summary-font')) document.getElementById('summary-font').value = settings.summaryFont || 'normal';
        if (document.getElementById('show-sum-best')) document.getElementById('show-sum-best').checked = settings.showSumBest ?? true;
        if (document.getElementById('show-best-complete')) document.getElementById('show-best-complete').checked = settings.showBestComplete ?? true;
        
        // Save the loaded display settings to the current state
        saveDisplaySettings(settings);
        
        // Apply the display settings immediately
        updateDisplaySettings();
      }
      
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
  const cfgChooseSave = document.getElementById('cfg-choose-save');
  const cfgClearSave = document.getElementById('cfg-clear-save');
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

  function cfgRenderRows(n, names = []) {
    cfgSplitsTbody.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td><input type="text" value="${names[i] || `Split ${i+1}`}" /></td>`;
      cfgSplitsTbody.appendChild(tr);
    }
  }
  function openConfig() {
    cfgTitle.value = runTitle;
    cfgIconPath.value = iconPath;
    updateIconDisplay(); // Update icon preview in config
    cfgCount.value = String(splitNames.length);
    cfgRenderRows(splitNames.length, splitNames);
    renderRecentFiles(); // Render recent files buttons
    
    // Load column visibility settings
    const visibility = getColumnVisibility();
    document.getElementById('col-split').checked = visibility.split;
    document.getElementById('col-total').checked = visibility.total;
    document.getElementById('col-segment').checked = visibility.segment;
    document.getElementById('col-diff').checked = visibility.diff;
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
    document.getElementById('row-height-preset').value = displaySettings.rowHeightPreset;
    document.getElementById('row-height-value').value = displaySettings.rowHeight;
    document.getElementById('row-padding-top').value = displaySettings.paddingTop;
    document.getElementById('row-padding-bottom').value = displaySettings.paddingBottom;
    document.getElementById('total-timer-font').value = displaySettings.totalTimerFont;
    document.getElementById('summary-font').value = displaySettings.summaryFont;
    document.getElementById('show-sum-best').checked = displaySettings.showSumBest;
    document.getElementById('show-best-complete').checked = displaySettings.showBestComplete;
    
    cfgBackdrop.hidden = false;
  }
  function closeConfig() { cfgBackdrop.hidden = true; }
  cfgBackdrop?.addEventListener('mousedown', (e) => { if (e.target === cfgBackdrop) closeConfig(); });
  cfgCancel?.addEventListener('click', (e) => { e.preventDefault(); closeConfig(); });
  const clampCount = (v) => Math.max(1, Math.min(50, Number(v) || 1));
  cfgCount?.addEventListener('input', () => {
    const n = clampCount(cfgCount.value);
    cfgCount.value = String(n);
    // If row count mismatches, re-render rows
    if (cfgSplitsTbody.querySelectorAll('input').length !== n) {
      cfgRenderRows(n);
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
        totalTimerFont: document.getElementById('total-timer-font').value,
        summaryFont: document.getElementById('summary-font').value,
        showSumBest: document.getElementById('show-sum-best').checked,
        showBestComplete: document.getElementById('show-best-complete').checked
      };
      saveDisplaySettings(displaySettings);
      
      // Get current column widths to include in save
      const currentWidths = getColumnWidths();
      
      // Persist settings immediately
      saveState({ runTitle, iconPath, splitNames, bestTotals, bestSegments, bestCompleteSplits, columnWidths: currentWidths });
      // Reset and re-render (silent)
      doReset();
      renderRows();
      updateColumnVisibility(); // Apply column visibility after rendering
      updateDisplaySettings(); // Apply display settings after rendering
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
              bestTotals: [],
              bestSegments: [],
              bestCompleteSplits: []
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
              if (cfgCount) cfgCount.value = String(splitNames.length);
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

  // Config: choose / clear save file
  cfgChooseSave?.addEventListener('click', async () => {
    console.log('Choose Save File clicked');
    
    try {
      // Show file browser modal using working backend
      await fpShow();
    } catch (error) {
      console.error('Failed to open file browser:', error);
      // Fallback: prompt for file path
      const currentPath = loadSavePath() || '/home/user/splits.json';
      const newPath = prompt('Enter the full path where you want to save splits:', currentPath);
      if (newPath && newPath.trim()) {
        saveSavePath(newPath.trim());
        addRecentFile(newPath.trim());
        console.log('Save path set to:', newPath.trim());
      }
    }
  });
  // Config: clear save file
  cfgClearSave?.addEventListener('click', () => { 
    saveSavePath(''); 
    renderRecentFiles(); // Update recent files display
  });

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
          await fpInvoke('write_text_file', { 
            path: fullPath, 
            content: JSON.stringify({
              runTitle: runTitle || 'Run Title',
              iconPath: iconPath || '',
              splitNames: splitNames || ['Split 1'],
              bestTotals: bestTotals || [0],
              bestSegments: bestSegments || [0],
              bestCompleteSplits: bestCompleteSplits || [0]
            }, null, 2)
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
  const columnCheckboxes = ['col-split', 'col-total', 'col-segment', 'col-diff', 'col-best-total', 'col-best-segment', 'col-best-complete'];
  columnCheckboxes.forEach(id => {
    const checkbox = document.getElementById(id);
    checkbox?.addEventListener('change', () => {
      updateConfigurationLive();
    });
  });
  
  // Column width inputs
  const columnWidthInputs = [
    'col-split-width', 'col-total-width', 'col-segment-width', 'col-diff-width',
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
    'row-margin-top', 'row-margin-bottom', 'total-timer-font', 'summary-font', 
    'show-sum-best', 'show-best-complete'
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
  
  function updateConfigurationLive() {
    // Update column visibility
    const visibility = {
      split: document.getElementById('col-split').checked,
      total: document.getElementById('col-total').checked,
      segment: document.getElementById('col-segment').checked,
      diff: document.getElementById('col-diff').checked,
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
      bestTotal: parseInt(document.getElementById('col-best-total-width')?.value) || 100,
      bestSegment: parseInt(document.getElementById('col-best-segment-width')?.value) || 100,
      bestComplete: parseInt(document.getElementById('col-best-complete-width')?.value) || 100
    };
    saveColumnWidths(widths);
    
    // Update display settings
    const displaySettings = {
      rowHeightPreset: document.getElementById('row-height-preset')?.value || 'normal',
      rowHeight: parseInt(document.getElementById('row-height-value')?.value) || 36,
      paddingTop: parseInt(document.getElementById('row-padding-top')?.value) ?? 8,
      paddingBottom: parseInt(document.getElementById('row-padding-bottom')?.value) ?? 8,
      totalTimerFont: document.getElementById('total-timer-font')?.value || 'large',
      summaryFont: document.getElementById('summary-font')?.value || 'normal',
      showSumBest: document.getElementById('show-sum-best')?.checked ?? true,
      showBestComplete: document.getElementById('show-best-complete')?.checked ?? true
    };
    saveDisplaySettings(displaySettings);
    
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
    if (iconPath && iconPath.trim()) {
      try {
        // Use backend to read image as base64 data URL
        const iconUrl = await window.__TAURI__.core.invoke('read_image_as_base64', { path: iconPath });
        
        // Update main table icon
        if (iconEl) {
          iconEl.innerHTML = `<img src="${iconUrl}" alt="Run Icon" style="width: 24px; height: 24px; object-fit: contain;">`;
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
    titleEl.textContent = runTitle;
    updateIconDisplay();
    bodyEl.innerHTML = '';
  splitNames.forEach((name, i) => {
      const tr = document.createElement('tr');
      tr.className = 'row';
      tr.dataset.index = String(i);
    tr.innerHTML = `
        <td class="name">${name}</td>
    <td class="time total" id="tot-${i}">—</td>
    <td class="time current" id="seg-${i}">00:00.000</td>
  <td class="time diff" id="diff-${i}">—</td>
  <td class="time best" id="best-${i}">${bestTotals[i] ? fmt(bestTotals[i]) : '—'}</td>
  <td class="time bestseg" id="bestseg-${i}">—</td>
  <td class="time bestcomplete" id="bestcomplete-${i}">—</td>
      `;
      bodyEl.appendChild(tr);
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
      const row = bodyEl.querySelector(`tr[data-index="${idx}"]`);
      if (row) row.classList.add('active');
    }
  }

  function totalElapsedNow(now) {
    if (currentSplit === 0) return 0;
    const idx = currentSplit - 1;
  const prev = idx > 0 ? (totalCumulative[idx - 1] || 0) : 0;
  const seg = (segmentElapsed[idx] || 0) + (paused ? 0 : (now - lastAdvanceEpoch));
  return prev + seg;
  }

  function updateDiff(i, cumulative) {
    const diffEl = document.getElementById(`diff-${i}`);
    // Only show for completed splits and currently active split
    const isCompleted = (currentSplit === 0 && (totalCumulative[i] || 0) > 0) || (i + 1 < currentSplit);
    const isCurrent = i + 1 === currentSplit;
    if (!isCompleted && !isCurrent) { diffEl.textContent = '—'; diffEl.classList.remove('positive','negative'); return; }
    const best = bestTotals[i];
    if (!best) { diffEl.textContent = '—'; diffEl.classList.remove('positive','negative'); return; }
    const delta = cumulative - best;
    const sign = delta === 0 ? '' : (delta > 0 ? '+' : '−');
    diffEl.textContent = `${sign}${fmt(Math.abs(delta))}`;
    diffEl.classList.toggle('positive', delta > 0);
    diffEl.classList.toggle('negative', delta < 0);
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

  updateDiff(i, tot || runningCumulative);
    }

    // If run has ended, show remembered total; else live total
    if (currentSplit === 0 && finalTotalMs > 0) {
      totalEl.textContent = fmtTotal(finalTotalMs);
    } else {
      totalEl.textContent = fmtTotal(totalElapsedNow(now));
    }
    // Footer values
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
      currentSplit = 0;
      lastAdvanceEpoch = 0;
      setActiveRow(-1);
    }
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
          saveState({ runTitle, iconPath, splitNames, bestTotals, bestSegments, bestCompleteSplits, columnWidths: currentWidths });
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
    doReset();
  }

  function doReset() {
    currentSplit = 0;
    startEpoch = 0;
    lastAdvanceEpoch = 0;
    segmentElapsed = new Array(splitNames.length).fill(0);
    totalCumulative = new Array(splitNames.length).fill(0);
    finalTotalMs = 0;
    paused = false;
    setActiveRow(-1);
    tick();
  }

  async function saveTimesToFile() {
    console.log('saveTimesToFile called');
    let filePath = loadSavePath();
    console.log('Current save path:', filePath);
    
    const payload = {
      runTitle,
      iconPath,
      splitNames,
      bestTotals,
      bestSegments,
      bestCompleteSplits,
      columnWidths: getColumnWidths(),
      displaySettings: getDisplaySettings(),
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
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (paused) {
        // resume
        const now = performance.now();
        lastAdvanceEpoch = now;
        paused = false;
      } else if (currentSplit === 0) {
        startRunIfNeeded();
      } else {
        advanceSplit();
      }
    }
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
            // Only process global keys when window is NOT focused
            if (!windowHasFocus) {
              const newKeys = await window.__TAURI__.core.invoke('check_global_keys');
              
              // Check if Backspace was newly pressed
              if (newKeys.includes('Backspace')) {
                console.log('Global Backspace detected via polling (window unfocused)');
                handleGlobalShortcut();
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

  // Global shortcut handler function
  function handleGlobalShortcut() {
    console.log('Global Backspace pressed');
    // Execute the same logic as the local keydown handler
    if (paused) {
      // resume
      const now = performance.now();
      lastAdvanceEpoch = now;
      paused = false;
      console.log('Timer resumed via global shortcut');
    } else if (currentSplit === 0) {
      startRunIfNeeded();
      console.log('Timer started via global shortcut');
    } else {
      advanceSplit();
      console.log('Split advanced via global shortcut');
    }
  }

  // Set up global shortcut monitoring (polling-based, no event listeners needed)
  function setupGlobalShortcutEventListeners() {
    console.log('Using polling-based global shortcuts with focus detection');
    console.log('Global shortcut monitoring ready');
  }

  // Init
  console.log('Initializing app components...');
  renderRows();
  setActiveRow(-1);
  buildContextMenu();
  setupGlobalShortcuts(); // Setup global shortcuts
  console.log('Context menu built, starting timer...');
  const id = setInterval(tick, 50); // ~20 Hz is enough for readability
  window.addEventListener('beforeunload', () => clearInterval(id));
  console.log('App initialization complete!');
  
  } // end initApp
})();
