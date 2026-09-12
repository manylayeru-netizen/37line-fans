import React from 'react';

interface StickerPaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const StickerPagination: React.FC<StickerPaginationProps> = ({ page, total, pageSize, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  const getVisiblePages = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const stickerColors = ['bg-shiba', 'bg-penguin', 'bg-mint', 'bg-tape-pink', 'bg-tape-blue'];

  return (
    <div className="flex items-center justify-center gap-2 mt-12 flex-wrap">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-9 h-9 rounded-full bg-paper border-2 border-cocoa/20 font-handwriting text-cocoa hover:border-shiba hover:bg-shiba/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ←
      </button>
      {getVisiblePages().map((p, idx) =>
        p === '...' ? (
          <span key={`dot-${idx}`} className="px-1 text-cocoa/50">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-full font-handwriting text-sm transition-all card-wobble ${
              page === p
                ? `${stickerColors[p % stickerColors.length]} text-ink shadow-md scale-110`
                : 'bg-paper border-2 border-cocoa/20 text-cocoa hover:border-shiba'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-9 h-9 rounded-full bg-paper border-2 border-cocoa/20 font-handwriting text-cocoa hover:border-shiba hover:bg-shiba/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        →
      </button>
    </div>
  );
};

export default StickerPagination;
