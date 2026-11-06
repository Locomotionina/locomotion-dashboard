import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "No date";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeDays(date: string | Date | null | undefined): string {
  if (!date) return "No deadline";
  const target = new Date(date).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `${diffDays}d remaining`;
}

/**
 * Automatically detects raw URLs (http:// or https://) in plain text
 * and converts them into clickable, secure hyperlink anchor elements.
 */
export function renderTextWithLinks(text?: string | null): React.ReactNode {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//)) {
      let cleanUrl = part;
      let trailingPunct = "";
      const matchPunct = part.match(/[.,;:!?)]+$/);
      if (matchPunct) {
        trailingPunct = matchPunct[0];
        cleanUrl = part.slice(0, -trailingPunct.length);
      }
      return React.createElement(
        "span",
        { key: index },
        React.createElement(
          "a",
          {
            href: cleanUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            className:
              "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline break-all font-medium transition-colors",
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
          cleanUrl
        ),
        trailingPunct
      );
    }
    return part;
  });
}
