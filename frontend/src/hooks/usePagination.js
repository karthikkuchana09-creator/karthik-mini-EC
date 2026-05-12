import { useState, useMemo, useCallback } from 'react';

export function usePagination({ initialPage = 1, initialPerPage = 20 } = {}) {
  const [page, setPage] = useState(initialPage);
  const [perPage] = useState(initialPerPage);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  const nextPage = useCallback(() => setPage((p) => Math.min(p + 1, totalPages)), [totalPages]);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goToPage = useCallback((p) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);
  const resetPage = useCallback(() => setPage(1), []);

  const pageButtons = useMemo(() => {
    const maxVisible = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - maxVisible + 1));
    return Array.from({ length: Math.min(maxVisible, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  return {
    page,
    perPage,
    total,
    totalPages,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
    resetPage,
    pageButtons,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
