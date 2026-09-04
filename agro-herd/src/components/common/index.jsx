import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 16, md: 24, lg: 32, xl: 48 };
  return (
    <Loader2
      size={sizes[size] || 24}
      className={`animate-spin text-brand-primary ${className}`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-farm-text-secondary text-sm">Loading...</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-farm-bg flex items-center justify-center mb-4">
          <Icon size={28} className="text-farm-text-secondary/40" />
        </div>
      )}
      <h3 className="font-heading font-semibold text-farm-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-farm-text-secondary max-w-md mb-4">{description}</p>
      )}
      {action && action}
    </div>
  );
}

export function Badge({ variant = 'default', children, className = '' }) {
  const variants = {
    healthy: 'badge-healthy',
    sick: 'badge-sick',
    pregnant: 'badge-pregnant',
    dry: 'badge-dry',
    sold: 'badge-sold',
    deceased: 'badge-deceased',
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-brand-primary/10 text-brand-primary',
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    success: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`badge ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white rounded-card shadow-modal w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-scale-in`}
      >
        {title && (
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-farm-border flex items-center justify-between rounded-t-card z-10">
            <h3 className="font-heading font-semibold text-lg">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-farm-text-secondary"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        Previous
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100">1</button>
          {start > 2 && <span className="px-1 text-farm-text-secondary">...</span>}
        </>
      )}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            p === page ? 'bg-brand-primary text-white' : 'hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-farm-text-secondary">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
      >
        Next
      </button>
    </div>
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', variant = 'danger' }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-farm-text-secondary mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

export const DateInput = React.forwardRef(({ className = '', onChange, value, defaultValue, ...props }, ref) => {
  return (
    <input
      type="date"
      ref={ref}
      value={value !== undefined ? (value || '') : undefined}
      defaultValue={defaultValue}
      onChange={onChange}
      className={`date-input ${className}`}
      {...props}
    />
  );
});

DateInput.displayName = 'DateInput';

