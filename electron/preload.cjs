const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
console.log('Preload script loading...');

contextBridge.exposeInMainWorld('electronAPI', {
  // Legacy db-query handler (kept for backward compatibility)
  dbQuery: (query, params) => ipcRenderer.invoke('db-query', query, params),
  
  // Media handlers
  saveMedia: (filename, buffer) => ipcRenderer.invoke('save-media', filename, buffer),
  getMedia: (filename) => ipcRenderer.invoke('get-media', filename),
  
  // Menu Item handlers
  menu: {
    getAll: () => ipcRenderer.invoke('menu:getAll'),
    getAvailable: () => ipcRenderer.invoke('menu:getAvailable'),
    getById: (id) => ipcRenderer.invoke('menu:getById', id),
    create: (itemData) => ipcRenderer.invoke('menu:create', itemData),
    update: (id, itemData) => ipcRenderer.invoke('menu:update', id, itemData),
    delete: (id) => ipcRenderer.invoke('menu:delete', id),
    toggleAvailability: (id) => ipcRenderer.invoke('menu:toggleAvailability', id),
    getSizes: (menuItemId) => ipcRenderer.invoke('menu:getSizes', menuItemId),
    saveSizes: (menuItemId, sizes) => ipcRenderer.invoke('menu:saveSizes', menuItemId, sizes),
    getCustomOptions: (menuItemId) => ipcRenderer.invoke('menu:getCustomOptions', menuItemId),
    saveCustomOptions: (menuItemId, options) => ipcRenderer.invoke('menu:saveCustomOptions', menuItemId, options),
  },
  
  // Category handlers
  category: {
    getAll: () => ipcRenderer.invoke('category:getAll'),
    getById: (id) => ipcRenderer.invoke('category:getById', id),
    create: (categoryData) => ipcRenderer.invoke('category:create', categoryData),
    update: (id, categoryData) => ipcRenderer.invoke('category:update', id, categoryData),
    delete: (id) => ipcRenderer.invoke('category:delete', id),
  },
  
  // Option Group handlers
  optionGroup: {
    getAll: () => ipcRenderer.invoke('optionGroup:getAll'),
    getById: (id) => ipcRenderer.invoke('optionGroup:getById', id),
    create: (groupData) => ipcRenderer.invoke('optionGroup:create', groupData),
    update: (id, groupData) => ipcRenderer.invoke('optionGroup:update', id, groupData),
    delete: (id) => ipcRenderer.invoke('optionGroup:delete', id),
  },
  
  // Option handlers
  option: {
    getAll: (optionGroupId) => ipcRenderer.invoke('option:getAll', optionGroupId),
    getById: (id) => ipcRenderer.invoke('option:getById', id),
    create: (optionData) => ipcRenderer.invoke('option:create', optionData),
    update: (id, optionData) => ipcRenderer.invoke('option:update', id, optionData),
    delete: (id) => ipcRenderer.invoke('option:delete', id),
  },
  
  // Addon handlers
  addon: {
    getAll: () => ipcRenderer.invoke('addon:getAll'),
    getById: (id) => ipcRenderer.invoke('addon:getById', id),
    create: (addonData) => ipcRenderer.invoke('addon:create', addonData),
    update: (id, addonData) => ipcRenderer.invoke('addon:update', id, addonData),
    delete: (id) => ipcRenderer.invoke('addon:delete', id),
  },
  
  // Table handlers
  table: {
    getAll: () => ipcRenderer.invoke('table:getAll'),
    getById: (id) => ipcRenderer.invoke('table:getById', id),
    getByStatus: (status) => ipcRenderer.invoke('table:getByStatus', status),
    create: (tableData) => ipcRenderer.invoke('table:create', tableData),
    update: (id, tableData) => ipcRenderer.invoke('table:update', id, tableData),
    delete: (id) => ipcRenderer.invoke('table:delete', id),
    updateStatus: (id, status) => ipcRenderer.invoke('table:updateStatus', id, status),
  },
  
  // Print handlers
  print: {
    kitchenOrder: (orderData) => ipcRenderer.invoke('print:kitchenOrder', orderData),
    customerReceipt: (orderData) => ipcRenderer.invoke('print:customerReceipt', orderData),
  },
  
  // Order handlers
  order: {
    delete: (id, userId) => ipcRenderer.invoke('order:delete', id, userId),
  },
  
  // User handlers
  user: {
    getByUsername: (username) => ipcRenderer.invoke('user:getByUsername', username),
    getAll: () => ipcRenderer.invoke('user:getAll'),
    create: (userData) => ipcRenderer.invoke('user:create', userData),
    update: (id, userData) => ipcRenderer.invoke('user:update', id, userData),
    updateLastLogin: (id) => ipcRenderer.invoke('user:updateLastLogin', id),
    delete: (id) => ipcRenderer.invoke('user:delete', id),
  },
  
  // Settings handlers
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key) => ipcRenderer.invoke('settings:get', key),
    update: (key, value) => ipcRenderer.invoke('settings:update', key, value),
    updateMultiple: (settings) => ipcRenderer.invoke('settings:updateMultiple', settings),
  },
});

console.log('Preload script loaded, electronAPI exposed');

