/**
 * Excel utilities - Re-exports from lazy-loaded version.
 * ExcelJS (~900KB) is only loaded when functions are actually called.
 * 
 * This file maintains backward compatibility with existing imports.
 */

export {
    exportToExcel,
    getExcelSheetNames,
    readExcelFile,
    readExcelFileAsArray,
    createWorkbook,
    saveWorkbook
} from './excelUtils.lazy.js';
