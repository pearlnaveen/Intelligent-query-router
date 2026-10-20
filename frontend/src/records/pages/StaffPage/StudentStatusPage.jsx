import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  getStudentsWithStatus,
  getStudentStatusHistory,
  updateStudentStatus,
  getStatusTutors,
  clearStudentStatusHistory,
} from '../../services/api';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:5173/institute_management_system';

const STATUS_CONFIG = {
  Active:                  { color: '#16a34a', bg: '#dcfce7', label: 'Active' },
  Inactive:                { color: '#6b7280', bg: '#f3f4f6', label: 'Inactive' },
  'Break of Study':        { color: '#d97706', bg: '#fef3c7', label: 'Break of Study' },
  'Suspended / Dismissed': { color: '#dc2626', bg: '#fee2e2', label: 'Suspended / Dismissed' },
  Discontinued:            { color: '#7c3aed', bg: '#ede9fe', label: 'Discontinued' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);
const BREAK_REASONS = ['Medical Reason', 'Personal Reason', 'Financial Reason', 'Family Reason', 'Other'];
const docUrl = (fn) => `${BACKEND_URL}/student-status/document/${fn}`;

// ── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Active'];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg,
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
};

// ── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ src, name, size = 36 }) => {
  const [err, setErr] = useState(false);
  const base = BACKEND_URL.replace('/institute_management_system', '');
  const imgSrc = src && !err ? (src.startsWith('http') ? src : `${base}${src}`) : null;
  return imgSrc ? (
    <img src={imgSrc} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
};

// ── PdfViewer fullscreen overlay ─────────────────────────────────────────────
const PdfViewer = ({ url, title, onClose }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px', background: '#1e293b', flexShrink: 0,
    }}>
      <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>📄 {title}</span>
      <div style={{ display: 'flex', gap: 10 }}>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{
            padding: '7px 16px', borderRadius: 8, background: '#2563eb',
            color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>↗ Open in Tab</a>
        <button onClick={onClose} style={{
          padding: '7px 16px', borderRadius: 8, border: 'none',
          background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>✕ Close</button>
      </div>
    </div>
    <iframe src={url} title={title} style={{ flex: 1, border: 'none', width: '100%' }} />
  </div>
);

// ── PdfUpload ────────────────────────────────────────────────────────────────
const PdfUpload = ({ label, fieldName, required, onChange, value }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 6px' }}>Max 5 MB · PDF only</p>
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10,
      border: '1.5px dashed #d1d5db', borderRadius: 8, padding: '10px 14px',
      cursor: 'pointer', background: '#f9fafb',
    }}>
      <span style={{ fontSize: 20 }}>📎</span>
      <span style={{ fontSize: 13, color: value ? '#2563eb' : '#9ca3af' }}>
        {value ? `${value.name} ✓` : 'Choose PDF file...'}
      </span>
      <input type="file" accept="application/pdf" style={{ display: 'none' }}
        onChange={e => onChange(fieldName, e.target.files[0] || null)} />
    </label>
  </div>
);

// ── Modal wrapper ────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  }}>
    <div style={{
      background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      width: '100%', maxWidth: wide ? 740 : 560, maxHeight: '92vh', overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px 14px', borderBottom: '1px solid #f3f4f6',
        position: 'sticky', top: 0, background: '#fff', zIndex: 1,
      }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111827' }}>{title}</h2>
        <button onClick={onClose} style={{
          border: 'none', background: '#f3f4f6', borderRadius: 8,
          width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#6b7280',
        }}>✕</button>
      </div>
      <div style={{ padding: '20px 24px 24px' }}>{children}</div>
    </div>
  </div>
);

// ── Small helpers ────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 12, marginBottom: 5 }}>
    <span style={{ fontSize: 12, color: '#9ca3af', width: 120, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{value || '—'}</span>
  </div>
);

const FormInput = ({ label, type = 'text', value, onChange, required, disabled }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      disabled={disabled} required={required}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: '1.5px solid #d1d5db', fontSize: 13, color: '#111827',
        background: disabled ? '#f9fafb' : '#fff', boxSizing: 'border-box',
      }} />
  </div>
);

const FormSelect = ({ label, value, onChange, required, options, disabled }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required={required}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: '1.5px solid #d1d5db', fontSize: 13, color: '#111827',
        background: disabled ? '#f9fafb' : '#fff', boxSizing: 'border-box',
      }}>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  </div>
);

const FormTextarea = ({ label, value, onChange, placeholder, required }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={3}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: '1.5px solid #d1d5db', fontSize: 13, color: '#111827',
        resize: 'vertical', boxSizing: 'border-box',
      }} />
  </div>
);

// ── DocLink – button that opens PDF fullscreen ───────────────────────────────
const DocLink = ({ filename, label, onView }) => {
  if (!filename) return null;
  return (
    <button
      onClick={() => onView(docUrl(filename), label)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'none', border: '1px solid #bfdbfe', borderRadius: 6,
        padding: '4px 10px', cursor: 'pointer', color: '#2563eb',
        fontSize: 11, fontWeight: 600, marginBottom: 4,
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      📄 {label}
    </button>
  );
};

// ── UnifiedStatusModal ───────────────────────────────────────────────────────
const UnifiedStatusModal = ({ student, onClose, onSubmit, loading }) => {
  const currentStatus = student.currentStatus || 'Active';

  const getInitialTarget = () => {
    if (currentStatus === 'Break of Study') return 'Active';
    if (currentStatus === 'Active') return 'Break of Study';
    return 'Active';
  };

  const [targetStatus, setTargetStatus] = useState(getInitialTarget());
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromDate, setFromDate]   = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate]       = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason]       = useState(BREAK_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [remarks, setRemarks]     = useState('');
  const [orderRef, setOrderRef]   = useState('');
  const [supportingDocument, setSupportingDoc]       = useState(null);
  const [returnDocument, setReturnDocument]           = useState(null);
  const [returnSupportingDoc, setReturnSupportingDoc] = useState(null);

  const isFromBreak        = currentStatus === 'Break of Study';
  const isFromSuspended    = currentStatus === 'Suspended / Dismissed';
  const isFromDiscontinued = currentStatus === 'Discontinued';
  const isRejoinFlow       = targetStatus === 'Active' && (isFromBreak || isFromSuspended || isFromDiscontinued);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { status: targetStatus, remarks };

    if (targetStatus === 'Break of Study') {
      if (!fromDate || !toDate) { toast.error('From and To dates are required'); return; }
      if (new Date(fromDate) > new Date(toDate)) { toast.error('"From Date" must be before or equal to "To Date"'); return; }
      if (!supportingDocument)  { toast.error('Supporting document (PDF) is required'); return; }
      payload.effectiveDate = fromDate;
      payload.fromDate = fromDate;
      payload.toDate   = toDate;
      payload.reason   = reason === 'Other' ? (otherReason || 'Other') : reason;
      payload.supportingDocument = supportingDocument;

    } else if (isRejoinFlow) {
      if (!returnDate)      { toast.error('Return/Join date is required'); return; }
      if (!returnDocument)  { toast.error('Return/Joining form (PDF) is required'); return; }
      payload.effectiveDate = returnDate;
      payload.returnDate    = returnDate;
      payload.returnDocument = returnDocument;
      payload.returnSupportingDoc = returnSupportingDoc;
      if (isFromSuspended || isFromDiscontinued) {
        if (!remarks) { toast.error('Remarks are required for reinstatement'); return; }
        payload.reason    = reason;
        payload.orderRef  = orderRef;
      }

    } else if (targetStatus === 'Suspended / Dismissed' || targetStatus === 'Discontinued') {
      if (!effectiveDate) { toast.error('Effective date is required'); return; }
      if (!reason)        { toast.error('Reason is required'); return; }
      payload.effectiveDate = effectiveDate;
      payload.reason        = reason;
      payload.orderRef      = orderRef;
      payload.supportingDocument = supportingDocument;

    } else if (targetStatus === 'Inactive') {
      payload.effectiveDate = effectiveDate || new Date().toISOString().slice(0, 10);
      payload.reason        = 'Inactive';
      payload.remarks       = remarks;

    } else {
      payload.effectiveDate = effectiveDate;
    }

    await onSubmit(payload);
  };

  const targetCfg = STATUS_CONFIG[targetStatus] || STATUS_CONFIG['Active'];

  return (
    <Modal title="Update Student Status" onClose={onClose} wide>
      {/* Student card */}
      <div style={{
        background: '#f8fafc', borderRadius: 12, padding: '14px 18px',
        border: '1px solid #e2e8f0', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{student.studentName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Current:</span>
            <StatusBadge status={currentStatus} />
          </div>
        </div>
        <div style={{
          display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 18,
          fontSize: 12.5, overflowX: 'auto', paddingBottom: 2,
        }}>
          <div style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: '#64748b' }}>Roll No: </span>
            <b style={{ color: '#0f172a' }}>{student.rollNumber}</b>
          </div>
          <div style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: '#64748b' }}>Reg No: </span>
            <b style={{ color: '#0f172a' }}>{student.registerNumber}</b>
          </div>
          <div style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: '#64748b' }}>Year/Sem: </span>
            <b style={{ color: '#0f172a' }}>{student.semester || '—'}</b>
          </div>
          <div style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: '#64748b' }}>Tutor: </span>
            <b style={{ color: '#0f172a' }}>{student.tutorName || 'Unassigned'}</b>
          </div>
        </div>
      </div>

      {/* Status selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
          Select New Status <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          {ALL_STATUSES.map(st => {
            const cfg = STATUS_CONFIG[st];
            const isSel = targetStatus === st;
            return (
              <button key={st} type="button" onClick={() => setTargetStatus(st)} style={{
                flex: 1, minWidth: 0, padding: '9px 4px', borderRadius: 8,
                border: isSel ? `2px solid ${cfg.color}` : '1.5px solid #e5e7eb',
                background: isSel ? cfg.bg : '#fff',
                color: isSel ? cfg.color : '#4b5563',
                fontWeight: isSel ? 800 : 600, fontSize: 11, cursor: 'pointer',
                textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                boxShadow: isSel ? `0 2px 8px ${cfg.color}30` : 'none', transition: 'all 0.15s',
              }}>
                {st}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Break of Study */}
        {targetStatus === 'Break of Study' && (
          <div style={{ background: '#fffbeb', borderRadius: 12, padding: 16, border: '1px solid #fde68a', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 14 }}>📅 Break of Study Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput label="From Date" type="date" value={fromDate} onChange={setFromDate} required />
              <FormInput label="To Date (Tentative)" type="date" value={toDate} onChange={setToDate} required />
            </div>
            <FormSelect label="Reason" value={reason} onChange={setReason} required options={BREAK_REASONS} />
            {reason === 'Other' && <FormInput label="Specify Reason" value={otherReason} onChange={setOtherReason} required />}
            <FormTextarea label="Remarks / Notes" value={remarks} onChange={setRemarks} placeholder="Approval reference, notes..." />
            <PdfUpload label="Supporting Document (PDF)" fieldName="supportingDocument" required value={supportingDocument} onChange={(_, f) => setSupportingDoc(f)} />
          </div>
        )}

        {/* Return from Break */}
        {targetStatus === 'Active' && isFromBreak && (
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, border: '1px solid #bbf7d0', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginBottom: 14 }}>🔄 Return from Break of Study</div>
            <FormInput label="Return / Rejoining Date" type="date" value={returnDate} onChange={setReturnDate} required />
            <PdfUpload label="Rejoining / Return Form (PDF)" fieldName="returnDocument" required value={returnDocument} onChange={(_, f) => setReturnDocument(f)} />
            <PdfUpload label="Medical Fitness / Supporting Doc (PDF)" fieldName="returnSupportingDoc" value={returnSupportingDoc} onChange={(_, f) => setReturnSupportingDoc(f)} />
            <FormTextarea label="Remarks" value={remarks} onChange={setRemarks} placeholder="Rejoining remarks..." />
          </div>
        )}

        {/* Reinstatement from Suspended */}
        {targetStatus === 'Active' && isFromSuspended && (
          <div style={{ background: '#fff7ed', borderRadius: 12, padding: 16, border: '1px solid #fed7aa', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#9a3412', marginBottom: 14 }}>✅ Reinstatement from Suspension</div>
            <div style={{ fontSize: 12, color: '#9a3412', background: '#fef3c7', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
              ⚠️ Previous Suspended record will be preserved in history with your remarks below.
            </div>
            <FormInput label="Reinstatement / Rejoining Date" type="date" value={returnDate} onChange={setReturnDate} required />
            <FormInput label="Order / Authority Reference" value={orderRef} onChange={setOrderRef} />
            <FormTextarea label="Reinstatement Remarks" value={remarks} onChange={setRemarks} placeholder="Order number, authority, reason for reinstatement..." required />
            <PdfUpload label="Reinstatement Order (PDF)" fieldName="returnDocument" required value={returnDocument} onChange={(_, f) => setReturnDocument(f)} />
            <PdfUpload label="Supporting Document (PDF)" fieldName="returnSupportingDoc" value={returnSupportingDoc} onChange={(_, f) => setReturnSupportingDoc(f)} />
          </div>
        )}

        {/* Re-admission from Discontinued */}
        {targetStatus === 'Active' && isFromDiscontinued && (
          <div style={{ background: '#faf5ff', borderRadius: 12, padding: 16, border: '1px solid #ddd6fe', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#5b21b6', marginBottom: 14 }}>🎓 Re-admission (Discontinued → Active)</div>
            <div style={{ fontSize: 12, color: '#5b21b6', background: '#ede9fe', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
              ⚠️ Discontinued record will be preserved in history. Upload re-admission order.
            </div>
            <FormInput label="Re-joining Date" type="date" value={returnDate} onChange={setReturnDate} required />
            <FormInput label="Re-admission Order Ref." value={orderRef} onChange={setOrderRef} />
            <FormTextarea label="Remarks" value={remarks} onChange={setRemarks} placeholder="Authority, order number, reason for re-admission..." required />
            <PdfUpload label="Re-admission Order / Form (PDF)" fieldName="returnDocument" required value={returnDocument} onChange={(_, f) => setReturnDocument(f)} />
            <PdfUpload label="Supporting Document (PDF)" fieldName="returnSupportingDoc" value={returnSupportingDoc} onChange={(_, f) => setReturnSupportingDoc(f)} />
          </div>
        )}

        {/* Active from Active */}
        {targetStatus === 'Active' && !isFromBreak && !isFromSuspended && !isFromDiscontinued && (
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, border: '1px solid #bbf7d0', marginBottom: 16 }}>
            <FormInput label="Effective Date" type="date" value={effectiveDate} onChange={setEffectiveDate} required />
            <FormTextarea label="Remarks / Notes" value={remarks} onChange={setRemarks} placeholder="Optional notes..." />
          </div>
        )}

        {/* Inactive */}
        {targetStatus === 'Inactive' && (
          <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 8 }}>ℹ️ Deactivate Student</div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px' }}>
              Student will be marked as <b>Inactive</b>. No mandatory form or supporting documents required.
            </p>
            <FormInput label="Effective Date" type="date" value={effectiveDate} onChange={setEffectiveDate} />
            <FormTextarea label="Remarks (Optional)" value={remarks} onChange={setRemarks} placeholder="Optional remarks..." />
          </div>
        )}

        {/* Suspended / Dismissed */}
        {targetStatus === 'Suspended / Dismissed' && (
          <div style={{ background: '#fef2f2', borderRadius: 12, padding: 16, border: '1px solid #fecaca', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#991b1b', marginBottom: 14 }}>⛔ Suspended / Dismissed Details</div>
            <FormInput label="Effective Date" type="date" value={effectiveDate} onChange={setEffectiveDate} required />
            <FormInput label="Reason / Grounds" value={reason} onChange={setReason} required />
            <FormInput label="Order / Authority Reference" value={orderRef} onChange={setOrderRef} />
            <FormTextarea label="Order Details / Remarks" value={remarks} onChange={setRemarks} placeholder="Order number, issuing authority..." />
            <PdfUpload label="Official Order (PDF)" fieldName="supportingDocument" value={supportingDocument} onChange={(_, f) => setSupportingDoc(f)} />
          </div>
        )}

        {/* Discontinued */}
        {targetStatus === 'Discontinued' && (
          <div style={{ background: '#f5f3ff', borderRadius: 12, padding: 16, border: '1px solid #ddd6fe', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#5b21b6', marginBottom: 14 }}>🚫 Discontinued Details</div>
            <FormInput label="Effective Date" type="date" value={effectiveDate} onChange={setEffectiveDate} required />
            <FormInput label="Reason for Discontinuation" value={reason} onChange={setReason} required />
            <FormTextarea label="Order Details / Remarks" value={remarks} onChange={setRemarks} placeholder="Enter details..." />
            <PdfUpload label="Supporting Document (PDF)" fieldName="supportingDocument" value={supportingDocument} onChange={(_, f) => setSupportingDoc(f)} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 8, border: '1.5px solid #d1d5db',
            background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontSize: 14,
          }}>Cancel</button>
          <button type="submit" disabled={loading} style={{
            padding: '10px 26px', borderRadius: 8, border: 'none',
            background: loading ? '#9ca3af' : targetCfg.color,
            color: '#fff', fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14,
            boxShadow: `0 3px 10px ${targetCfg.color}40`,
          }}>
            {loading ? 'Saving...' : `Save as ${targetStatus}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ── SummaryCard ──────────────────────────────────────────────────────────────
const SummaryCard = ({ status, count, onClick, active }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <div onClick={() => onClick(status)} style={{
      background: active ? cfg.bg : '#fff',
      border: `2px solid ${active ? cfg.color : '#e5e7eb'}`,
      borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
      flex: 1, minWidth: 120,
      boxShadow: active ? `0 4px 12px ${cfg.color}30` : '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'all 0.18s',
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: cfg.color }}>{count}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginTop: 2, lineHeight: 1.3 }}>{cfg.label}</div>
    </div>
  );
};

// ── StudentDrawer ────────────────────────────────────────────────────────────
const StudentDrawer = ({ student, onClose, onUpdateStatus, onClearHistory }) => {
  const [activeTab, setActiveTab]           = useState('profile');
  const [history, setHistory]               = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewPdf, setViewPdf]               = useState(null);
  const [clearConfirm, setClearConfirm]     = useState(false);
  const [clearing, setClearing]             = useState(false);

  const loadHistory = useCallback(() => {
    if (!student) return;
    setHistoryLoading(true);
    getStudentStatusHistory(student.studentId)
      .then(r => setHistory(r.data?.data || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [student?.studentId]);

  useEffect(() => { loadHistory(); }, [loadHistory, student?.currentStatus]);

  if (!student) return null;

  const tabs = [
    { id: 'profile',   label: '👤 Profile' },
    { id: 'documents', label: '📄 Docs' },
  ];

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await onClearHistory(student.studentId);
      setHistory([]);
      setClearConfirm(false);
    } finally {
      setClearing(false);
    }
  };

  const openPdf = (url, title) => setViewPdf({ url, title });

  const tabContent = () => {
    if (activeTab === 'profile') return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
            👤 Personal Information
          </h4>
          <InfoRow label="Full Name"    value={student.studentName} />
          <InfoRow label="Roll No."     value={student.rollNumber} />
          <InfoRow label="Register No." value={student.registerNumber} />
          <InfoRow label="Email"        value={student.email} />
          <InfoRow label="Phone"        value={student.personal_phone} />
          <InfoRow label="Gender"       value={student.gender} />
          <InfoRow label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-IN') : '—'} />
          <InfoRow label="Tutor Ward"   value={student.tutorName} />
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
            🎓 Academic Details
          </h4>
          <InfoRow label="Department"    value={student.departmentName} />
          <InfoRow label="Dept. Acronym" value={student.departmentAcr} />
          <InfoRow label="Batch"         value={student.batch} />
          <InfoRow label="Semester"      value={student.semester} />
          <InfoRow label="Course"        value={student.course} />
          <InfoRow label="Current Status" value={student.currentStatus} />
        </div>
      </div>
    );
    if (activeTab === 'documents') {
      const docs = history.filter(h => h.supportingDocument || h.returnDocument || h.returnSupportingDoc);
      return docs.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>No documents available.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {docs.map(h => (
            <div key={h.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                {new Date(h.createdAt).toLocaleDateString('en-IN')} — <StatusBadge status={h.status} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <DocLink filename={h.supportingDocument} label="Supporting Document" onView={openPdf} />
                <DocLink filename={h.returnDocument}     label="Return / Order Form"  onView={openPdf} />
                <DocLink filename={h.returnSupportingDoc} label="Fitness / Supporting" onView={openPdf} />
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#f8fafc', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top Header Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
        padding: '16px 28px', color: '#fff', display: 'flex', alignItems: 'center',
        justify: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <button onClick={onClose} style={{
            border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: 10,
            padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ← Back to List
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar src={student.profileImage} name={student.studentName} size={50} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>{student.studentName}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2, display: 'flex', gap: 12 }}>
                <span>Roll: <b>{student.rollNumber}</b></span>
                <span>·</span>
                <span>Reg: <b>{student.registerNumber}</b></span>
                <span>·</span>
                <span>Dept: <b>{student.departmentAcr || '—'}</b></span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StatusBadge status={student.currentStatus || 'Active'} />
          <button onClick={onUpdateStatus} style={{
            padding: '9px 18px', borderRadius: 9,
            background: '#ffffff', color: '#1e3a8a',
            border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            ✏️ Update Status
          </button>
          <button onClick={onClose} style={{
            border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: 10,
            width: 38, height: 38, cursor: 'pointer', fontSize: 18, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div style={{
        display: 'flex', gap: 10, padding: '0 28px', borderBottom: '1px solid #e2e8f0',
        background: '#fff', flexShrink: 0,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 800,
            color: activeTab === t.id ? '#2563eb' : '#64748b',
            borderBottom: activeTab === t.id ? '3px solid #2563eb' : '3px solid transparent',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Full-Screen Body Content */}
      <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Profile / Academic / Docs content */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
            {tabs.find(t => t.id === activeTab)?.label} Details
          </h3>
          {tabContent()}
        </div>

        {/* Status History Section */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>📋 Status History & Logs</h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>Complete audit trail of status changes, remarks, and official documents</p>
            </div>
            {history.length > 0 && !clearConfirm && (
              <button onClick={() => setClearConfirm(true)} style={{
                fontSize: 12, padding: '7px 16px', borderRadius: 8,
                border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', cursor: 'pointer', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🗑 Clear All Status History
              </button>
            )}
          </div>

          {clearConfirm && (
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: '16px 20px', border: '1.5px solid #fecaca', marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#991b1b', marginBottom: 6 }}>
                ⚠️ Are you sure you want to clear all status history for {student.studentName}?
              </div>
              <p style={{ fontSize: 12, color: '#7f1d1d', margin: '0 0 14px' }}>
                This permanently deletes all status logs, records, and uploaded PDFs from disk. The student will reset to default (Active).
              </p>
              <div style={{ display: 'flex', gap: 10, maxWidth: 360 }}>
                <button onClick={handleClearHistory} disabled={clearing} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: clearing ? '#9ca3af' : '#dc2626', color: '#fff',
                  fontWeight: 800, fontSize: 13, cursor: clearing ? 'not-allowed' : 'pointer',
                }}>
                  {clearing ? 'Clearing...' : 'Yes, Clear All'}
                </button>
                <button onClick={() => setClearConfirm(false)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  border: '1.5px solid #d1d5db', background: '#fff',
                  color: '#374151', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          )}

          {historyLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading status history...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No status history records found. Student is on default status (Active).</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 }}>
              {history.map((h, idx) => {
                const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG['Active'];
                return (
                  <div key={h.id || idx} style={{
                    display: 'flex', gap: 16, paddingBottom: 20,
                    borderLeft: '2px solid #e2e8f0', paddingLeft: 20,
                    marginLeft: 8, position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', left: -9, top: 4,
                      width: 16, height: 16, borderRadius: '50%',
                      background: cfg.color, border: '3px solid #fff',
                      boxShadow: `0 0 0 2px ${cfg.color}30`,
                    }} />
                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <StatusBadge status={h.status} />
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                          {new Date(h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {h.reason && <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}><b>Reason:</b> {h.reason}</div>}
                      {h.remarks && <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}><b>Remarks:</b> {h.remarks}</div>}
                      {h.createdByName && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Updated by: {h.createdByName}</div>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        <DocLink filename={h.supportingDocument} label="Supporting Document" onView={openPdf} />
                        <DocLink filename={h.returnDocument} label="Return / Order Form" onView={openPdf} />
                        <DocLink filename={h.returnSupportingDoc} label="Fitness / Supporting Cert" onView={openPdf} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {viewPdf && <PdfViewer url={viewPdf.url} title={viewPdf.title} onClose={() => setViewPdf(null)} />}
    </div>
  );
};

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
const StudentStatusPage = () => {
  const [students, setStudents]   = useState([]);
  const [tutors, setTutors]       = useState([]);
  const [loading, setLoading]     = useState(true);

  const [search, setSearch]               = useState('');
  const [filterTutor, setFilterTutor]     = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalStudent, setModalStudent]       = useState(null);
  const [submitting, setSubmitting]           = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudentsWithStatus();
      const list = Array.isArray(res.data?.data) ? res.data.data
        : Array.isArray(res.data) ? res.data : [];
      setStudents(list);
    } catch (e) {
      console.error('Failed to load students:', e);
      toast.error(e.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTutors = useCallback(async () => {
    try {
      const res = await getStatusTutors();
      const list = Array.isArray(res.data?.data) ? res.data.data
        : Array.isArray(res.data) ? res.data : [];
      setTutors(list);
    } catch (e) { console.warn('Failed to load tutors:', e); }
  }, []);

  useEffect(() => { fetchStudents(); fetchTutors(); }, [fetchStudents, fetchTutors]);

  // Base filtering (Search, Tutor, Semester — BEFORE status filter)
  const baseFilteredStudents = students.filter(s => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || (
      String(s.studentName || '').toLowerCase().includes(q) ||
      String(s.rollNumber || '').toLowerCase().includes(q) ||
      String(s.registerNumber || '').toLowerCase().includes(q) ||
      String(s.tutorName || '').toLowerCase().includes(q) ||
      String(s.departmentName || '').toLowerCase().includes(q) ||
      String(s.departmentAcr || '').toLowerCase().includes(q)
    );
    const matchTutor    = !filterTutor  || String(s.tutorName || '').trim() === String(filterTutor).trim();
    const matchSemester = !filterSemester || String(s.semester || '').trim() === String(filterSemester).trim();
    return matchSearch && matchTutor && matchSemester;
  });

  // Final filtering (including status filter for table list)
  const filteredStudents = baseFilteredStudents.filter(s => {
    return !filterStatus || s.currentStatus === filterStatus;
  });

  // Summary counts from baseFilteredStudents — they update as search/tutor/semester filters change
  // (but are NOT affected by the status card filter, so you can see counts across all statuses at once)
  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = baseFilteredStudents.filter(st => (st.currentStatus || 'Active') === s).length;
    return acc;
  }, {});
  const activeFinal = counts['Active'] || 0;
  const totalFiltered = Object.values(counts).reduce((a, b) => a + b, 0);

  // Submit
  const handleStatusSubmit = async (formPayload) => {
    if (!modalStudent) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(formPayload).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') fd.append(k, v);
      });
      await updateStudentStatus(modalStudent.studentId, fd);
      toast.success(`${modalStudent.studentName} status updated to ${formPayload.status}!`);
      if (selectedStudent?.studentId === modalStudent.studentId) {
        setSelectedStudent(prev => ({ ...prev, currentStatus: formPayload.status }));
      }
      setModalStudent(null);
      fetchStudents();
    } catch (e) {
      console.error('Update status error:', e);
      toast.error(e.response?.data?.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  // Clear history
  const handleClearHistory = async (studentId) => {
    try {
      await clearStudentStatusHistory(studentId);
      toast.success('Status history cleared. Student reset to Active.');
      fetchStudents();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to clear history');
      throw e;
    }
  };

  const resetFilters = () => {
    setSearch(''); setFilterTutor(''); setFilterStatus(''); setFilterSemester('');
  };

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: '100vh', padding: '10px 0 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#111827' }}>🎓 Student Status</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
          View and manage student academic status, break of study and student records
        </p>
      </div>

      {/* Filter card */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: 18,
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: 18,
        border: '1px solid #f3f4f6',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 }}>Year / Semester</label>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#374151', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">All Years</option>
              {['1','2','3','4','5','6','7','8'].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 }}>Tutor Ward</label>
            <select value={filterTutor} onChange={e => setFilterTutor(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#374151', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">All Tutors</option>
              {tutors.map(t => (
                <option key={t.staffId || t.tutorName} value={t.tutorName}>{t.tutorName}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 }}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#374151', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">All Statuses</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 }}>Search</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>🔍</span>
              <input
                type="text" placeholder="Search by Name, Roll No, Register No, Tutor..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 34px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#374151', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={resetFilters} style={{
            padding: '7px 16px', borderRadius: 8, border: '1.5px solid #d1d5db',
            background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>↺ Reset Filters</button>
          {(search || filterTutor || filterStatus || filterSemester) && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {filteredStudents.length === 0
                ? `No students match your filters (${students.length} total)`
                : `Showing ${filteredStudents.length} of ${students.length} students`
              }
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {ALL_STATUSES.map(s => (
          <SummaryCard key={s} status={s}
            count={s === 'Active' ? activeFinal : (counts[s] || 0)}
            onClick={st => setFilterStatus(prev => prev === st ? '' : st)}
            active={filterStatus === s}
          />
        ))}
      </div>

      {/* Count row */}
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>
          {filterStatus
            ? `${filteredStudents.length} ${filterStatus} student${filteredStudents.length !== 1 ? 's' : ''} (of ${totalFiltered} filtered)`
            : `Total: ${totalFiltered} student${totalFiltered !== 1 ? 's' : ''}`
          }
        </span>
        {loading && <span style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</span>}
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 14,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 960 }}>
            <colgroup>
              <col style={{ width: 50 }} />
              <col style={{ width: 56 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 220 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderBottom: '2px solid #e2e8f0' }}>
                {['S.No','Photo','Roll No.','Student Name','Sem','Tutor Ward','Status','Action'].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 800, color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.06em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 56, textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
                      Loading students...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 56, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                    🔍 No students found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr
                    key={student.studentId}
                    onClick={() => setSelectedStudent(student)}
                    style={{
                      borderBottom: idx < filteredStudents.length - 1 ? '1px solid #f1f5f9' : 'none',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0f7ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  >
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                      <Avatar src={student.profileImage} name={student.studentName} size={34} />
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                        {student.rollNumber}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.studentName}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{student.registerNumber}</div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#374151' }}>{student.semester || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.tutorName || <span style={{ color: '#d1d5db' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <StatusBadge status={student.currentStatus || 'Active'} />
                    </td>
                    <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setModalStudent(student)}
                        style={{
                          padding: '6px 14px', borderRadius: 7,
                          background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                          color: '#fff', border: 'none', fontWeight: 700,
                          fontSize: 11, cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                          whiteSpace: 'nowrap', transition: 'transform 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = ''}
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedStudent && (
        <StudentDrawer
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdateStatus={() => setModalStudent(selectedStudent)}
          onClearHistory={handleClearHistory}
        />
      )}

      {/* Status modal */}
      {modalStudent && (
        <UnifiedStatusModal
          student={modalStudent}
          onClose={() => setModalStudent(null)}
          onSubmit={handleStatusSubmit}
          loading={submitting}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default StudentStatusPage;
