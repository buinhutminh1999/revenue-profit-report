/**
 * Currency and number formatting helpers
 * Shared across InternalTaxReport, VATReportTab, and other finance components
 */

/**
 * Parse a currency string to a number
 * Handles Vietnamese format (1.234.567,89) and international format (1,234,567.89)
 * Also handles negative values in parentheses: (1.234)
 * @param {string|number} str - Currency string or number
 * @returns {number} - Parsed number value
 */
export const parseCurrency = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;

    let cleanStr = String(str).trim();
    let isNegative = false;

    // Handle negative values in parentheses: (1.234)
    if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
        isNegative = true;
        cleanStr = cleanStr.slice(1, -1);
    } else if (cleanStr.startsWith('-')) {
        isNegative = true;
        cleanStr = cleanStr.slice(1);
    }

    let result = 0;

    // If multiple commas, treat as thousand separator (international format)
    if ((cleanStr.match(/,/g) || []).length > 1) {
        result = parseFloat(cleanStr.replace(/,/g, ''));
    } else {
        // Vietnamese format: dots as thousand separator, comma as decimal
        result = parseFloat(cleanStr.replace(/\./g, '').replace(/,/g, '.'));
    }

    if (isNaN(result)) return 0;
    return isNegative ? -result : result;
};

/**
 * Format a number as Vietnamese currency string
 * @param {number} num - Number to format
 * @returns {string} - Formatted currency string (e.g., "1.234.567")
 */
export const formatCurrency = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return new Intl.NumberFormat('vi-VN').format(Math.round(num));
};

/**
 * Format a number as Vietnamese currency with dash for zero
 * Useful for report tables where "-" represents no value
 * @param {number} num - Number to format
 * @returns {string} - Formatted string or "-" if zero
 */
export const formatCurrencyOrDash = (num) => {
    if (num === null || num === undefined || isNaN(num) || num === 0) return "-";
    return new Intl.NumberFormat('vi-VN').format(Math.round(num));
};

/**
 * Format a number as percentage
 * @param {number} num - Decimal number (0.15 = 15%)
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (num) => {
    if (isNaN(num)) return "0%";
    return new Intl.NumberFormat('vi-VN', {
        style: 'percent',
        maximumFractionDigits: 2
    }).format(num);
};

/**
 * Parse a date string in DD/MM/YYYY format
 * @param {string} dateStr - Date string to parse
 * @returns {Object|null} - { day, month, year } or null if invalid
 */
export const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return { day, month, year };
};

/**
 * Format a date object to DD/MM/YYYY string
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
    if (!date || !(date instanceof Date)) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};
