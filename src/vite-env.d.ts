/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    // Legacy db-query handler (kept for backward compatibility)
    dbQuery: (query: string, params?: any[]) => Promise<any>;
    
    // Media handlers
    saveMedia: (filename: string, buffer: ArrayBuffer) => Promise<string>;
    getMedia: (filename: string) => Promise<Buffer | null>;
    
    // Menu Item handlers
    menu: {
      getAll: () => Promise<any[]>;
      getAvailable: () => Promise<any[]>;
      getById: (id: number) => Promise<any | null>;
      create: (itemData: any) => Promise<any>;
      update: (id: number, itemData: any) => Promise<any>;
      delete: (id: number) => Promise<boolean>;
      toggleAvailability: (id: number) => Promise<any>;
      getSizes: (menuItemId: number) => Promise<any[]>;
      saveSizes: (menuItemId: number, sizes: any[]) => Promise<boolean>;
      getCustomOptions: (menuItemId: number) => Promise<any[]>;
      saveCustomOptions: (menuItemId: number, options: any[]) => Promise<boolean>;
    };
    
    // Category handlers
    category: {
      getAll: () => Promise<any[]>;
      getById: (id: number) => Promise<any | null>;
      create: (categoryData: any) => Promise<any>;
      update: (id: number, categoryData: any) => Promise<any>;
      delete: (id: number) => Promise<boolean>;
    };
    
    // Option Group handlers
    optionGroup: {
      getAll: () => Promise<any[]>;
      getById: (id: number) => Promise<any | null>;
      create: (groupData: any) => Promise<any>;
      update: (id: number, groupData: any) => Promise<any>;
      delete: (id: number) => Promise<boolean>;
    };
    
    // Option handlers
    option: {
      getAll: (optionGroupId?: number) => Promise<any[]>;
      getById: (id: number) => Promise<any | null>;
      create: (optionData: any) => Promise<any>;
      update: (id: number, optionData: any) => Promise<any>;
      delete: (id: number) => Promise<boolean>;
    };
    
    // Addon handlers
    addon: {
      getAll: () => Promise<any[]>;
      getById: (id: number) => Promise<any | null>;
      create: (addonData: any) => Promise<any>;
      update: (id: number, addonData: any) => Promise<any>;
      delete: (id: number) => Promise<boolean>;
    };
    
    // Table handlers
    table: {
      getAll: () => Promise<any[]>;
      getById: (id: number) => Promise<any | null>;
      getByStatus: (status: string) => Promise<any[]>;
      create: (tableData: any) => Promise<any>;
      update: (id: number, tableData: any) => Promise<any>;
      delete: (id: number) => Promise<boolean>;
      updateStatus: (id: number, status: string) => Promise<any>;
    };
  
  // Print handlers
  print: {
    kitchenOrder: (orderData: any) => Promise<{ success: boolean }>;
    customerReceipt: (orderData: any) => Promise<{ success: boolean }>;
  };
  
  // Order handlers
  order: {
    delete: (id: number, userId?: number) => Promise<{ success: boolean; message?: string }>;
  };
  
  // User handlers
  user: {
    getByUsername: (username: string) => Promise<any | null>;
    getAll: () => Promise<any[]>;
    create: (userData: any) => Promise<any>;
    update: (id: number, userData: any) => Promise<any>;
    updateLastLogin: (id: number) => Promise<any>;
    delete: (id: number) => Promise<any>;
  };
  
  // Settings handlers
  settings: {
    getAll: () => Promise<any[]>;
    get: (key: string) => Promise<any | null>;
    update: (key: string, value: string) => Promise<any>;
    updateMultiple: (settings: Array<{ key: string; value: string }>) => Promise<{ success: boolean }>;
  };

  // Sync handlers
  sync: {
    push: () => Promise<{ pushed: number; imagesUploaded?: number; imagesSkipped?: number; imagesTotalInDb?: number; imagesDeletedFromStorage?: number; errors: { table: string; message: string }[] }>;
    pull: () => Promise<{ pulled: number; imagesDownloaded?: number; errors: { table: string; message: string }[] }>;
    full: () => Promise<{ pushed: number; pulled: number; errors: { table: string; message: string }[] }>;
    testConnection: () => Promise<{ success: boolean }>;
    getLastSync: () => Promise<string | null>;
    getImageDiagnostics: () => Promise<{
      mediaPath: string | null;
      mediaPathExists: boolean;
      filesInMediaFolder: string[];
      menuItemsWithImages: number;
      imagePathsFromDb: string[];
      matchingFiles: string[];
    }>;
  };
};
}

