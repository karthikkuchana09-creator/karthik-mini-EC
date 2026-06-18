export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.svg',
  '.zip', '.rar',
];

export const ALLOWED_MIME_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml',
  'application/zip', 'application/x-rar-compressed',
  'application/octet-stream',
];

export const DOCUMENT_TYPES = [
  { value: 'REQUIREMENT', label: 'Requirement' },
  { value: 'SPECIFICATION', label: 'Specification' },
  { value: 'REFERENCE', label: 'Reference' },
  { value: 'DELIVERABLE', label: 'Deliverable' },
  { value: 'OTHER', label: 'Other' },
];

export const TYPE_STYLES = {
  REQUIREMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  SPECIFICATION: 'bg-purple-50 text-purple-700 border-purple-200',
  REFERENCE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELIVERABLE: 'bg-amber-50 text-amber-700 border-amber-200',
  OTHER: 'bg-gray-50 text-gray-600 border-gray-200',
};

export const TYPE_ICONS = {
  REQUIREMENT: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  SPECIFICATION: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  REFERENCE: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  DELIVERABLE: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  OTHER: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
};

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function getFileExtension(filename) {
  if (!filename) return '';
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

export function validateFile(file) {
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type "${ext}" is not supported` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds 10 MB limit (${formatFileSize(file.size)})` };
  }
  return { valid: true };
}
