/**
 * Print Service - Production-Grade Thermal Printer Integration
 * 
 * Features:
 * - Print queue management to prevent concurrent jobs
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 * - Resource cleanup and memory management
 * - Silent printing option for thermal printers
 * - Input validation and sanitization
 * - Detailed logging for debugging
 */

import { BrowserWindow } from 'electron';

// ============================================================================
// Configuration Constants
// ============================================================================

const CONFIG = {
  // Timeout settings (in milliseconds)
  PRINT_TIMEOUT: 20000, // 20 seconds - reasonable for thermal printers
  RENDER_DELAY: 500,    // Time to wait for HTML rendering
  CLEANUP_DELAY: 1000,  // Delay before cleanup to ensure print completes
  
  // Retry settings
  MAX_RETRIES: 2,
  RETRY_DELAY_BASE: 1000, // Base delay for exponential backoff
  
  // Print options
  SILENT_MODE: true, // Set to false to show print dialog
  PAGE_SIZE: '80mm',
  MARGIN_TYPE: 'none',
  
  // Queue settings
  MAX_QUEUE_SIZE: 10,
};

// ============================================================================
// Print Queue Management
// ============================================================================

class PrintQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentJob = null;
  }

  /**
   * Add a print job to the queue
   * @param {Function} job - Function that returns a Promise
   * @returns {Promise} Promise that resolves when the job completes
   */
  async enqueue(job) {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= CONFIG.MAX_QUEUE_SIZE) {
        reject(new Error('Print queue is full. Please wait and try again.'));
        return;
      }

      this.queue.push({
        job,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.process();
    });
  }

  /**
   * Process the next job in the queue
   */
  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const { job, resolve, reject } = this.queue.shift();
    this.currentJob = { startTime: Date.now() };

    try {
      const result = await job();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.processing = false;
      this.currentJob = null;
      // Process next job if available
      this.process();
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentJob: this.currentJob,
    };
  }
}

const printQueue = new PrintQueue();

// ============================================================================
// Error Classes
// ============================================================================

class PrintError extends Error {
  constructor(message, code, retryable = false) {
    super(message);
    this.name = 'PrintError';
    this.code = code;
    this.retryable = retryable;
    Error.captureStackTrace(this, PrintError);
  }
}

class PrintTimeoutError extends PrintError {
  constructor(message = 'Print operation timed out') {
    super(message, 'TIMEOUT', true);
    this.name = 'PrintTimeoutError';
  }
}

class PrintCancelledError extends PrintError {
  constructor(message = 'Print operation was cancelled') {
    super(message, 'CANCELLED', false);
    this.name = 'PrintCancelledError';
  }
}

class PrintFailedError extends PrintError {
  constructor(message = 'Print operation failed') {
    super(message, 'FAILED', true);
    this.name = 'PrintFailedError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency for display
 */
const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SLE',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Sanitize HTML to prevent XSS
 */
const sanitizeHTML = (str) => {
  if (typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Sleep utility for delays
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = CONFIG.MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (error instanceof PrintError && !error.retryable) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt < maxRetries) {
        const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.log(`Print attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Validate order data structure
 */
function validateOrderData(orderData, type) {
  if (!orderData || typeof orderData !== 'object') {
    throw new PrintError('Invalid order data: must be an object', 'INVALID_DATA');
  }

  if (!orderData.order_number || typeof orderData.order_number !== 'string') {
    throw new PrintError('Invalid order data: order_number is required', 'INVALID_DATA');
  }

  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw new PrintError('Invalid order data: items array is required and must not be empty', 'INVALID_DATA');
  }

  // Validate items
  orderData.items.forEach((item, index) => {
    if (!item.name || typeof item.name !== 'string') {
      throw new PrintError(`Invalid item at index ${index}: name is required`, 'INVALID_DATA');
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new PrintError(`Invalid item at index ${index}: quantity must be a positive number`, 'INVALID_DATA');
    }
  });

  // Additional validation for customer receipts
  if (type === 'receipt') {
    if (typeof orderData.total_amount !== 'number' || isNaN(orderData.total_amount)) {
      throw new PrintError('Invalid order data: total_amount is required for receipts', 'INVALID_DATA');
    }
  }
}

// ============================================================================
// HTML Template Generators
// ============================================================================

/**
 * Generate kitchen order HTML template
 */
const getKitchenOrderHTML = (orderData) => {
  const { order_number, items, customer_name, created_at } = orderData;
  const date = new Date(created_at || new Date()).toLocaleString();
  
  let itemsHTML = '';
  items.forEach((item) => {
    const itemName = sanitizeHTML(item.name);
    const quantity = item.quantity || 1;
    
    itemsHTML += `
      <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #ccc;">
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 4px;">
          ${quantity}x ${itemName}
        </div>
        ${item.size ? `<div style="font-size: 14px; color: #666;">Size: ${sanitizeHTML(item.size)}</div>` : ''}
        ${item.options && Array.isArray(item.options) && item.options.length > 0 ? `
          <div style="font-size: 14px; color: #666; margin-top: 4px;">
            Options: ${item.options.map(opt => sanitizeHTML(opt.name || opt)).join(', ')}
          </div>
        ` : ''}
        ${item.notes ? `
          <div style="font-size: 14px; color: #d32f2f; margin-top: 4px; font-style: italic;">
            Note: ${sanitizeHTML(item.notes)}
          </div>
        ` : ''}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media print {
          @page {
            size: ${CONFIG.PAGE_SIZE} auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 10mm;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        body {
          font-family: 'Courier New', 'Courier', monospace;
          font-size: 14px;
          line-height: 1.4;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10mm;
          color: #000;
          background: #fff;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .header p {
          margin: 5px 0 0 0;
          font-size: 12px;
          font-weight: bold;
        }
        .order-info {
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ccc;
        }
        .order-info div {
          margin: 4px 0;
          font-size: 14px;
        }
        .items {
          margin-bottom: 15px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 2px solid #000;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>The Kings Bakery</h1>
        <p>KITCHEN ORDER</p>
      </div>
      <div class="order-info">
        <div><strong>Order #:</strong> ${sanitizeHTML(order_number)}</div>
        ${customer_name ? `<div><strong>Customer:</strong> ${sanitizeHTML(customer_name)}</div>` : ''}
        <div><strong>Time:</strong> ${sanitizeHTML(date)}</div>
      </div>
      <div class="items">
        ${itemsHTML}
      </div>
      <div class="footer">
        <p>Thank you!</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate customer receipt HTML template
 * Uses HTML tables for reliable layout and adds extra spacing to flush printer buffer
 */
const getCustomerReceiptHTML = (orderData) => {
  const { 
    order_number, 
    items, 
    subtotal, 
    total_amount, 
    payment_method, 
    created_at,
    customer_name 
  } = orderData;
  
  const date = created_at ? new Date(created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  }) : new Date().toLocaleString();

  // Generate items rows
  const itemsRows = items.map(item => {
    const itemName = sanitizeHTML(item.name || 'Item');
    const quantity = item.quantity || 1;
    const price = typeof item.price === 'number' ? item.price : 0;
    const itemSubtotal = item.subtotal || (price * quantity);
    
    return `
      <tr>
        <td style="padding: 2px 0;">${quantity}x ${itemName}</td>
        <td style="text-align: right; padding: 2px 0;">${formatCurrency(itemSubtotal)}</td>
      </tr>
    `;
  }).join('');

  const subtotalValue = typeof subtotal === 'number' ? subtotal : total_amount;
  const totalValue = typeof total_amount === 'number' ? total_amount : 0;
  const paymentDisplay = payment_method ? payment_method.charAt(0).toUpperCase() + payment_method.slice(1) : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: monospace; 
      margin: 0; 
      padding: 5px; 
      width: 100%;
      font-size: 12px;
    }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size: 16px;">THE KINGS BAKERY</div>
  <div class="divider"></div>
  
  <table>
    <tr><td>Order #:</td><td class="right">${sanitizeHTML(order_number || '')}</td></tr>
    <tr><td>Date:</td><td class="right">${sanitizeHTML(date)}</td></tr>
    ${customer_name ? `<tr><td>Customer:</td><td class="right">${sanitizeHTML(customer_name)}</td></tr>` : ''}
  </table>
  
  <div class="divider"></div>
  
  <table>
    ${itemsRows}
  </table>
  
  <div class="divider"></div>
  
  <table>
    <tr><td>Subtotal:</td><td class="right">${formatCurrency(subtotalValue)}</td></tr>
    <tr class="bold"><td>TOTAL:</td><td class="right">${formatCurrency(totalValue)}</td></tr>
    ${paymentDisplay ? `<tr><td>Payment:</td><td class="right">${sanitizeHTML(paymentDisplay)}</td></tr>` : ''}
  </table>
  
  <div class="divider"></div>
  
  <div class="center" style="margin-top: 5px;">Thank you!</div>
  
  <!-- Extra line breaks to flush printer buffer so next receipt doesn't start on same line -->
  <br/><br/><br/>
</body>
</html>`;
};

// ============================================================================
// Core Print Function
// ============================================================================

/**
 * Print HTML content to thermal printer
 * @param {string} html - HTML content to print
 * @param {string|null} printerName - Optional printer name
 * @returns {Promise<boolean>} True if print succeeded
 */
const printHTML = async (html, printerName = null) => {
  if (!html || typeof html !== 'string') {
    throw new PrintError('Invalid HTML content', 'INVALID_DATA');
  }

  return new Promise((resolve, reject) => {
    let isResolved = false;
    let timeoutId = null;
    let printWindow = null;
    let cleanupScheduled = false;

    const cleanup = () => {
      if (cleanupScheduled) return;
      cleanupScheduled = true;

      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Close window after delay to ensure print completes
      if (printWindow && !printWindow.isDestroyed()) {
        setTimeout(() => {
          try {
            if (printWindow && !printWindow.isDestroyed()) {
              printWindow.close();
            }
          } catch (error) {
            console.error('Error closing print window:', error);
          }
        }, CONFIG.CLEANUP_DELAY);
      }
    };

    const resolveOnce = (value) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve(value);
      }
    };

    const rejectOnce = (error) => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        reject(error);
      }
    };

    try {
      // Create hidden browser window for printing
      printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });

      // Set timeout for entire operation
      timeoutId = setTimeout(() => {
        rejectOnce(new PrintTimeoutError('Print operation timed out. Please check your printer connection and try again.'));
      }, CONFIG.PRINT_TIMEOUT);

      // Load HTML content
      const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      printWindow.loadURL(dataURL);

      // Handle successful load
      printWindow.webContents.once('did-finish-load', () => {
        console.log('[PrintService] Content loaded, preparing to print...');
        
        // Wait for rendering to complete
        setTimeout(() => {
          try {
            const printOptions = {
              silent: CONFIG.SILENT_MODE,
              printBackground: true,
              margins: {
                marginType: CONFIG.MARGIN_TYPE,
              },
            };

            if (printerName && typeof printerName === 'string') {
              printOptions.deviceName = printerName;
              console.log(`[PrintService] Using specified printer: ${printerName}`);
            }

            console.log('[PrintService] Sending print job...');

            // Execute print
            printWindow.webContents.print(printOptions, (success, errorType) => {
              if (success) {
                console.log('[PrintService] Print job completed successfully');
                resolveOnce(true);
              } else {
                console.error(`[PrintService] Print failed: ${errorType}`);
                let error;
                if (errorType === 'cancelled') {
                  error = new PrintCancelledError('Print operation was cancelled by user');
                } else {
                  error = new PrintFailedError(
                    `Print job failed. Please check that your printer is connected, powered on, and has paper. Error: ${errorType || 'Unknown'}`
                  );
                }
                rejectOnce(error);
              }
            });
          } catch (error) {
            console.error('[PrintService] Error during print execution:', error);
            rejectOnce(new PrintError(`Print execution failed: ${error.message}`, 'EXECUTION_ERROR'));
          }
        }, CONFIG.RENDER_DELAY);
      });

      // Handle load failure
      printWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`[PrintService] Failed to load content: ${errorCode} - ${errorDescription}`);
        rejectOnce(new PrintError(
          `Failed to load print content: ${errorDescription || errorCode}`,
          'LOAD_ERROR'
        ));
      });

      // Handle window close (should not happen during normal operation)
      printWindow.once('closed', () => {
        if (!isResolved) {
          console.warn('[PrintService] Print window was closed unexpectedly');
        }
      });

    } catch (error) {
      console.error('[PrintService] Error creating print window:', error);
      rejectOnce(new PrintError(`Failed to initialize print: ${error.message}`, 'INIT_ERROR'));
    }
  });
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Print kitchen order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Result object
 */
export const printKitchenOrder = async (orderData) => {
  const startTime = Date.now();
  console.log('[PrintService] Kitchen order print requested:', orderData.order_number);

  try {
    // Validate input
    validateOrderData(orderData, 'kitchen');

    // Generate HTML
    const html = getKitchenOrderHTML(orderData);

    // Queue and execute print job with retry
    const result = await printQueue.enqueue(async () => {
      return await retryWithBackoff(async () => {
        await printHTML(html, null);
        return { success: true };
      });
    });

    const duration = Date.now() - startTime;
    console.log(`[PrintService] Kitchen order printed successfully in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PrintService] Kitchen order print failed after ${duration}ms:`, error);
    
    // Enhance error message for better user experience
    if (error instanceof PrintError) {
      throw error;
    }
    throw new PrintError(
      `Failed to print kitchen order: ${error.message}`,
      'UNKNOWN_ERROR',
      false
    );
  }
};

/**
 * Print customer receipt
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Result object
 */
export const printCustomerReceipt = async (orderData) => {
  const startTime = Date.now();
  console.log('[PrintService] Customer receipt print requested:', orderData.order_number);

  try {
    // Validate input
    validateOrderData(orderData, 'receipt');

    // Generate HTML
    const html = getCustomerReceiptHTML(orderData);

    // Queue and execute print job with retry
    const result = await printQueue.enqueue(async () => {
      return await retryWithBackoff(async () => {
        await printHTML(html, null);
        return { success: true };
      });
    });

    const duration = Date.now() - startTime;
    console.log(`[PrintService] Customer receipt printed successfully in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PrintService] Customer receipt print failed after ${duration}ms:`, error);
    
    // Enhance error message for better user experience
    if (error instanceof PrintError) {
      throw error;
    }
    throw new PrintError(
      `Failed to print customer receipt: ${error.message}`,
      'UNKNOWN_ERROR',
      false
    );
  }
};

/**
 * Get print queue status (for debugging/monitoring)
 * @returns {Object} Queue status
 */
export const getPrintQueueStatus = () => {
  return printQueue.getStatus();
};
