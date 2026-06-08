import { useEffect, useCallback } from 'react';
import { formatTimestamp } from '../../utils/format';

const STATUS_STYLES = {
  ACTIVE: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  SUSPENDED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  TRIAL: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  CANCELLED: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
};

export default function TenantDetailsDrawer({ isOpen, onClose, tenant }) {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen || !tenant) return null;

  const statusStyle = STATUS_STYLES[tenant.status] || STATUS_STYLES.CANCELLED;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Tenant Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                <span className="text-white font-bold text-lg">
                  {tenant.name?.charAt(0)?.toUpperCase() || 'T'}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 truncate">{tenant.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{tenant.slug}</p>
              </div>
              <div className={`ml-auto px-3 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.border}`}>
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${statusStyle.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                  {tenant.status}
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <Section title="Contact Information">
                <InfoRow label="Email" value={tenant.contact_email} />
                <InfoRow label="Phone" value={tenant.phone || '-'} />
              </Section>

              <Section title="Organization Details">
                <InfoRow label="Industry" value={tenant.industry ? tenant.industry.replace(/_/g, ' ') : '-'} />
                <InfoRow label="Address" value={tenant.address || '-'} />
              </Section>

              <Section title="Account Info">
                <InfoRow label="Tenant ID" value={`#${tenant.id}`} mono />
                <InfoRow label="Slug" value={tenant.slug} mono />
                <InfoRow label="Status" value={tenant.status} />
              </Section>

              <Section title="Timeline">
                <InfoRow label="Created At" value={formatTimestamp(tenant.created_at)} />
                <InfoRow label="Updated At" value={formatTimestamp(tenant.updated_at)} />
              </Section>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            Tenant ID: #{tenant.id} &middot; Slug: {tenant.slug}
          </p>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
        {title}
      </h4>
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-gray-900 text-right break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
