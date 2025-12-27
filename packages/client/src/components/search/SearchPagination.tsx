import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/Button";

interface SearchPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const SearchPagination = React.memo(function SearchPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: SearchPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">Show</span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value={6}>6</option>
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={48}>48</option>
        </select>
        <span className="text-sm text-gray-700">per page</span>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">
          Showing {(page - 1) * limit + 1}{" "}
          to{" "}
          {Math.min(
            page * limit,
            total
          )}{" "}
          of {total} results
        </span>
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center space-x-1">
          {Array.from(
            { length: Math.min(5, totalPages) },
            (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (
                page >=
                totalPages - 2
              ) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={
                    page === pageNum
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            }
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});
