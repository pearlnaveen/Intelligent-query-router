import React, { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, FileSpreadsheet, X, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import Modal from './Modal';

import { normalizeToDbDate } from '../utils/dateUtils';

const getColumnLetter = (colIdx) => {
  let temp = colIdx;
  let letter = '';
  while (temp > 0) {
    let mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
};

export const parseFlexDate = (val) => {
  return normalizeToDbDate(val);
};

const ExcelBulkUploadModal = ({
  isOpen,
  onClose,
  title = 'Bulk Excel Upload',
  columns = [],
  onUpload,
  templateFilename = 'Template.xlsx',
  hasChooseFileField = true,
  customRowValidation = null,
}) => {
  const hasFileColumns = Boolean(hasChooseFileField || columns.some((col) => col.type === 'file' || /proof|document|file|certificate|report|photo|copy/i.test(col.key || col.label)));
  const [file, setFile] = useState(null);
  const [validRows, setValidRows] = useState([]);
  const [errorList, setErrorList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const templateSheet = workbook.addWorksheet('Template');
      const proofNote = 'If a supporting document/proof is required, complete the Bulk Upload first. After the record is created, use the Edit option to upload the document through the corresponding Choose File field.';
      let headerRowIndex = 1;

      if (hasFileColumns) {
        const lastColLetter = getColumnLetter(Math.max(columns.length, 1));
        templateSheet.mergeCells(`A1:${lastColLetter}1`);
        const noteCell = templateSheet.getCell('A1');
        noteCell.value = `NOTE: ${proofNote}`;
        noteCell.font = { italic: true, bold: true, color: { argb: 'FF92400E' }, size: 10 };
        noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        noteCell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
        templateSheet.getRow(1).height = 42;
        headerRowIndex = 2;
        const instructionsSheet = workbook.addWorksheet('Instructions');
        instructionsSheet.getColumn('A').width = 115;
        const titleCell = instructionsSheet.getCell('A1');
        titleCell.value = 'Bulk Upload - Supporting Document / Proof Instructions';
        titleCell.font = { bold: true, size: 12, color: { argb: 'FF4F46E5' } };
        const instructionCell = instructionsSheet.getCell('A3');
        instructionCell.value = proofNote;
        instructionCell.font = { size: 11, italic: true };
        instructionCell.alignment = { wrapText: true };
        instructionsSheet.getRow(3).height = 45;
      }

      const headers = columns.map((col) => (col.required ? `${col.label} *` : col.label));
      const sampleRow = columns.map((col) => col.example || (col.type === 'file' ? 'proof_document.pdf' : ''));
      templateSheet.addRow(headers);
      templateSheet.addRow(sampleRow);
      const headerRow = templateSheet.getRow(headerRowIndex);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      columns.forEach((col, index) => {
        templateSheet.getColumn(getColumnLetter(index + 1)).width = Math.max(col.label.length + 6, 22);
      });

      const masterColumns = columns.filter((col) => Array.isArray(col.options) && col.options.length > 0);
      if (masterColumns.length > 0) {
        const masterSheet = workbook.addWorksheet('Master Data');
        masterColumns.forEach((col, colIndex) => {
          const masterColLetter = getColumnLetter(colIndex + 1);
          masterSheet.getCell(`${masterColLetter}1`).value = col.label;
          masterSheet.getCell(`${masterColLetter}1`).font = { bold: true };
          col.options.forEach((option, optionIndex) => {
            masterSheet.getCell(`${masterColLetter}${optionIndex + 2}`).value = String(option);
          });
          const templateColIndex = columns.findIndex((item) => item.key === col.key) + 1;
          const templateColLetter = getColumnLetter(templateColIndex);
          const maxOptionRow = Math.max(col.options.length + 1, 2);
          for (let row = headerRowIndex + 1; row <= 1000; row += 1) {
            templateSheet.getCell(`${templateColLetter}${row}`).dataValidation = {
              type: 'list', allowBlank: !col.required,
              formulae: [`'Master Data'!$${masterColLetter}$2:$${masterColLetter}$${maxOptionRow}`],
              showErrorMessage: !col.isDynamicMaster, errorTitle: 'Invalid Selection',
              error: col.isDynamicMaster ? undefined : `Please select a valid option from the dropdown list. Allowed options: ${col.options.slice(0, 5).join(', ')}...`,
            };
          }
        });
      }
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), templateFilename);
      toast.success('Template with dynamic Excel dropdowns downloaded successfully!');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleDownloadErrorReport = () => {
    if (errorList.length === 0) {
      toast.error('No validation errors to export');
      return;
    }
    try {
      const rows = [['Row #', 'Field Name', 'Invalid Value', 'Reason / Violation', 'Expected Value'], ...errorList.map((error) => [`Row ${error.row}`, error.field, String(error.value ?? ''), error.reason, error.expected || 'N/A'])];
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 25 }, { wch: 35 }, { wch: 30 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Errors');
      XLSX.writeFile(workbook, 'Upload_Validation_Error_Report.xlsx');
      toast.success('Validation Error Report downloaded');
    } catch (error) {
      console.error('Error generating error report:', error);
      toast.error('Failed to download error report');
    }
  };

  const normalizeHeaderStr = (str) => {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/\s*\*/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  };

  const validateData = (rawJson, isRevalidation = false) => {
    if (!rawJson || rawJson.length === 0) return;
    let headerRowIdx = 0;
    let maxMatches = -1;
    for (let rowIndex = 0; rowIndex < Math.min(rawJson.length, 10); rowIndex += 1) {
      const row = rawJson[rowIndex];
      if (!Array.isArray(row)) continue;
      let matches = 0;
      columns.forEach((col) => {
        const normKey = normalizeHeaderStr(col.key);
        const normLabel = normalizeHeaderStr(col.label);
        const normAliases = (col.aliases || []).map(normalizeHeaderStr);
        if (row.some((cell) => {
          const normCell = normalizeHeaderStr(cell);
          if (!normCell) return false;
          return normCell === normKey || normCell === normLabel || normAliases.includes(normCell) || normKey.includes(normCell) || normCell.includes(normKey);
        })) matches += 1;
      });
      if (matches > maxMatches && matches > 0) {
        maxMatches = matches;
        headerRowIdx = rowIndex;
      }
    }
    const rawHeaders = rawJson[headerRowIdx] || [];
    const headerMap = {};
    columns.forEach((col) => {
      const normKey = normalizeHeaderStr(col.key);
      const normLabel = normalizeHeaderStr(col.label);
      const normAliases = (col.aliases || []).map(normalizeHeaderStr);

      // Try exact or normalized match first
      let index = rawHeaders.findIndex((header) => {
        const normH = normalizeHeaderStr(header);
        if (!normH) return false;
        return normH === normKey || normH === normLabel || normAliases.includes(normH);
      });

      // Try substring/containment match if exact match not found
      if (index === -1) {
        index = rawHeaders.findIndex((header) => {
          const normH = normalizeHeaderStr(header);
          if (!normH) return false;
          return normH.includes(normKey) || normKey.includes(normH) || normLabel.includes(normH) || normH.includes(normLabel);
        });
      }

      if (index !== -1) headerMap[col.key] = index;
    });

    const validList = [];
    const errors = [];

    const hasNptelCol = columns.some((col) => col.key === 'nptel_category' || col.key === 'offered_by');
    const hasDurationCols = columns.some((col) => col.key === 'hours' || col.key === 'weeks' || col.key === 'duration_type');

    rawJson.slice(headerRowIdx + 1).forEach((row, rowIndex) => {
      const excelRowNum = rowIndex + headerRowIdx + 2;
      if (!row || row.every((value) => value === undefined || value === null || String(value).trim() === '')) return;
      const firstCell = String(row[0] || '').trim();
      if (firstCell.startsWith('NOTE:') || firstCell.startsWith('If a supporting document')) return;
      const rowObject = {};
      let rowHasError = false;
      columns.forEach((col) => {
        const columnIndex = headerMap[col.key];
        let value = columnIndex !== undefined ? row[columnIndex] : undefined;
        if (typeof value === 'string') value = value.trim();
        if (col.required && (value === undefined || value === null || value === '')) {
          errors.push({ row: excelRowNum, field: col.label, value: value ?? 'Empty', reason: `Field "${col.label}" is required`, expected: 'Required non-empty value' });
          rowHasError = true;
          return;
        }
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(col.options) && col.options.length > 0) {
            const matchedOption = col.options.find((option) => String(option).toLowerCase() === String(value).toLowerCase());
            if (!matchedOption && !col.isDynamicMaster) {
              errors.push({ row: excelRowNum, field: col.label, value, reason: `Invalid dropdown selection for field "${col.label}"`, expected: col.options.slice(0, 5).join(' / ') + (col.options.length > 5 ? ' ...' : '') });
              rowHasError = true;
              return;
            }
            if (matchedOption) value = matchedOption;
          }
          if (col.type === 'number') {
            const number = Number(value);
            if (isNaN(number)) {
              errors.push({ row: excelRowNum, field: col.label, value, reason: 'Must be a valid numeric value', expected: 'Number (e.g. 100)' });
              rowHasError = true;
              return;
            }
            value = number;
          } else if (col.type === 'date') {
            const parsedDate = parseFlexDate(value);
            if (!parsedDate) {
              errors.push({ row: excelRowNum, field: col.label, value, reason: 'Invalid date format', expected: 'YYYY-MM-DD, Month-Year (e.g. Nov-24), or Year (e.g. 2025)' });
              rowHasError = true;
              return;
            }
            value = parsedDate;
          } else if (col.type === 'file') {
            value = value || '';
          }
        }
        rowObject[col.key] = value !== undefined ? value : '';
      });

      // Module-specific post validation: NPTEL Category check (only for Certification Course uploads)
      if (hasNptelCol) {
        const isNptel = rowObject.offered_by && String(rowObject.offered_by).trim().toUpperCase().includes('NPTEL');
        if (isNptel && (!rowObject.nptel_category || !String(rowObject.nptel_category).trim())) {
          errors.push({
            row: excelRowNum,
            field: 'NPTEL Certification Category',
            value: rowObject.nptel_category || 'Empty',
            reason: 'NPTEL Certification Category is required when Offered By is NPTEL',
            expected: 'Select category (Elite, Elite + Silver, Elite + Gold, etc.)',
          });
          rowHasError = true;
        }
      }

      // Module-specific post validation: Duration check (only for Certification Course uploads)
      if (hasDurationCols) {
        const hasH = rowObject.hours !== undefined && rowObject.hours !== null && String(rowObject.hours).trim() !== '' && !isNaN(parseFloat(rowObject.hours)) && parseFloat(rowObject.hours) > 0;
        const hasW = rowObject.weeks !== undefined && rowObject.weeks !== null && String(rowObject.weeks).trim() !== '' && !isNaN(parseFloat(rowObject.weeks)) && parseFloat(rowObject.weeks) > 0;
        const durType = String(rowObject.duration_type || '').trim().toLowerCase();

        if (!hasH && !hasW && !durType) {
          errors.push({
            row: excelRowNum,
            field: 'Course Duration',
            value: 'Empty',
            reason: 'Either Number of Hours or Number of Weeks must be provided',
            expected: 'Enter positive number for Hours or Weeks',
          });
          rowHasError = true;
        }
      }

      // Optional custom validation function passed by caller page
      if (typeof customRowValidation === 'function') {
        const customRes = customRowValidation(rowObject, excelRowNum);
        if (customRes) {
          const list = Array.isArray(customRes) ? customRes : [customRes];
          if (list.length > 0) {
            errors.push(...list);
            rowHasError = true;
          }
        }
      }

      if (!rowHasError) validList.push(rowObject);
    });
    setValidRows(validList);
    setErrorList(errors);
    if (!isRevalidation) {
      if (errors.length === 0 && validList.length > 0) toast.success(`Validated ${validList.length} rows cleanly without errors!`);
      else if (errors.length > 0) toast.error(`Found ${errors.length} validation errors in uploaded sheet`);
    }
  };

  const handleFileSelect = (uploadedFile) => {
    if (!uploadedFile) return;
    if (!['.xlsx', '.xls', '.csv'].some((extension) => uploadedFile.name.toLowerCase().endsWith(extension))) {
      toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array', cellDates: false, raw: false });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
        if (!rawJson || rawJson.length < 2) {
          toast.error('The uploaded sheet is empty or missing headers');
          return;
        }
        validateData(rawJson);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to read Excel file. Please ensure it is not corrupted.');
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleReset = () => {
    setFile(null);
    setValidRows([]);
    setErrorList([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows available to save');
      return;
    }
    try {
      setIsSubmitting(true);
      await onUpload(validRows);
      toast.success(`Saved ${validRows.length} valid records to the database!`);
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error saving bulk records:', error);
      const serverMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save bulk records';
      const details = error.response?.data?.details;
      toast.error(Array.isArray(details) && details.length > 0 ? `${serverMessage}: ${details.join('; ')}` : serverMessage, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { handleReset(); onClose(); }}
      title={title || "Excel Bulk Upload"}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-6">
        {hasFileColumns && (
          <div className="bg-amber-50/90 border border-amber-200 border-l-4 border-l-amber-500 p-4 rounded-xl shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Supporting Document / Proof Upload Notice</h4>
                <p className="text-xs text-amber-800 font-medium mt-1 leading-relaxed">
                  If a supporting document/proof is required, complete the Bulk Upload first. After the record is created, use the Edit option to upload the document through the corresponding Choose File field.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-4 bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl">
          <div>
            <h4 className="text-sm font-bold text-indigo-950">Step 1: Download Standard Template</h4>
            <p className="text-xs text-indigo-700 mt-0.5">Download pre-formatted Excel template with correct column names &amp; sample data. Fill in record details and upload the Excel file below.</p>
          </div>
          <button type="button" onClick={handleDownloadTemplate} className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 shadow-sm transition-all">
            <Download size={15} />Download Excel Template
          </button>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Step 2: Upload Filled Excel File</h4>
          <div 
            onDragOver={(event) => { event.preventDefault(); setIsDragActive(true); }} 
            onDragLeave={() => setIsDragActive(false)} 
            onDrop={(event) => { event.preventDefault(); setIsDragActive(false); if (event.dataTransfer.files?.[0]) handleFileSelect(event.dataTransfer.files[0]); }} 
            onClick={() => fileInputRef.current?.click()} 
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-indigo-500 bg-indigo-50/50' : file ? 'border-green-300 bg-green-50/30' : 'border-gray-300 hover:border-indigo-400 bg-gray-50/30'}`}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={(event) => event.target.files?.[0] && handleFileSelect(event.target.files[0])} />
            <Upload className={`mx-auto mb-2 ${file ? 'text-green-600' : 'text-indigo-500'}`} size={28} />
            {file ? (
              <div>
                <p className="text-sm font-bold text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB - Click or drag to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-700">Click to browse or drag &amp; drop Excel file here</p>
                <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .xls, and .csv formats</p>
              </div>
            )}
          </div>
        </div>

        {file && (
          <div className="flex gap-4">
            <div className="flex-1 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <div>
                <span className="text-xs font-semibold text-green-800 uppercase tracking-wider">Valid Rows</span>
                <p className="text-lg font-bold text-green-900">{validRows.length}</p>
              </div>
            </div>
            <div className="flex-1 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-3">
              <AlertTriangle className="text-red-600" size={20} />
              <div>
                <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">Validation Errors</span>
                <p className="text-lg font-bold text-red-900">{errorList.length}</p>
              </div>
            </div>
          </div>
        )}

        {errorList.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-red-700 flex items-center gap-1.5"><AlertTriangle size={16} />Validation Error Details ({errorList.length})</h4>
              <button type="button" onClick={handleDownloadErrorReport} className="px-3 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md flex items-center gap-1 transition-all">
                <Download size={13} />Download Error Report (.xlsx)
              </button>
            </div>
            <div className="border border-red-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs table-fixed border-collapse">
                <thead className="bg-red-100/80 text-red-900 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-[12%] min-w-[65px]">Row #</th>
                    <th className="px-3 py-2.5 w-[22%] min-w-[110px]">Field</th>
                    <th className="px-3 py-2.5 w-[18%] min-w-[90px]">Invalid Value</th>
                    <th className="px-3 py-2.5 w-[24%] min-w-[130px]">Reason</th>
                    <th className="px-3 py-2.5 w-[24%] min-w-[130px]">Expected Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 bg-white">
                  {errorList.map((error, index) => (
                    <tr key={index} className="hover:bg-red-50/50 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-red-800 align-top whitespace-nowrap">Row {error.row}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 align-top break-words leading-tight">{error.field}</td>
                      <td className="px-3 py-2.5 text-gray-600 align-top break-words leading-tight">
                        <span className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-mono break-all">
                          {String(error.value ?? '')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-red-600 font-medium align-top break-words leading-tight">{error.reason}</td>
                      <td className="px-3 py-2.5 text-indigo-700 font-medium align-top break-words leading-tight">{error.expected || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button type="button" onClick={handleReset} disabled={!file || isSubmitting} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-1 disabled:opacity-40">
            <RefreshCw size={14} />Reset
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={() => { handleReset(); onClose(); }} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={validRows.length === 0 || isSubmitting} className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Saving Records...' : <><Upload size={16} />Save {validRows.length} Valid Records</>}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ExcelBulkUploadModal;
