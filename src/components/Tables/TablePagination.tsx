"use client";

import React from "react";
import { Pagination } from "@heroui/react";
import { cn } from "../../lib/utils";

type PageItem = number | "ellipsis-left" | "ellipsis-right";

const linkClass = "text-muted hover:bg-surface hover:text-foreground";
const activeClass = "bg-accent text-accent-foreground hover:bg-accent-hover";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  siblingCount?: number;
}

const getPageItems = (
  page: number,
  totalPages: number,
  siblingCount: number
): PageItem[] => {
  const totalNumbers = siblingCount * 2 + 5;

  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, totalPages);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, index) => index + 1
    );

    return [...leftRange, "ellipsis-right", totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, index) => totalPages - (3 + siblingCount * 2) + 1 + index
    );

    return [1, "ellipsis-left", ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, index) => leftSibling + index
  );

  return [1, "ellipsis-left", ...middleRange, "ellipsis-right", totalPages];
};

export function TablePagination({
  page,
  totalPages,
  onPageChange,
  className,
  size = "sm",
  siblingCount = 1,
}: TablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), safeTotalPages);
  const pageItems = React.useMemo(
    () => getPageItems(currentPage, safeTotalPages, siblingCount),
    [currentPage, safeTotalPages, siblingCount]
  );

  const goToPage = React.useCallback(
    (nextPage: number) => {
      const clampedPage = Math.min(Math.max(1, nextPage), safeTotalPages);

      if (clampedPage !== currentPage) {
        onPageChange(clampedPage);
      }
    },
    [currentPage, onPageChange, safeTotalPages]
  );

  return (
    <Pagination
      aria-label="Table pagination"
      size={size}
      className={cn("justify-center", className)}
    >
      <Pagination.Content className="gap-1 rounded-xl bg-default p-1">
        <Pagination.Item>
          <Pagination.Previous
            aria-label="Previous page"
            className={linkClass}
            isDisabled={currentPage <= 1}
            onPress={() => goToPage(currentPage - 1)}
          >
            <Pagination.PreviousIcon />
          </Pagination.Previous>
        </Pagination.Item>
        {pageItems.map((pageItem) =>
          typeof pageItem === "number" ? (
            <Pagination.Item key={pageItem}>
              <Pagination.Link
                className={pageItem === currentPage ? activeClass : linkClass}
                isActive={pageItem === currentPage}
                onPress={() => goToPage(pageItem)}
              >
                {pageItem}
              </Pagination.Link>
            </Pagination.Item>
          ) : (
            <Pagination.Item key={pageItem}>
              <Pagination.Ellipsis className="text-muted" />
            </Pagination.Item>
          )
        )}
        <Pagination.Item>
          <Pagination.Next
            aria-label="Next page"
            className={linkClass}
            isDisabled={currentPage >= safeTotalPages}
            onPress={() => goToPage(currentPage + 1)}
          >
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
