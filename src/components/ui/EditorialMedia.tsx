'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';

export interface ShowcaseImageProps {
  src?: string;
  alt: string;
  ratio?: '16/10' | '16/9' | '4/3';
  className?: string;
}

const RATIO_CLASSES = {
  '16/10': 'aspect-[16/10]',
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
};

/** Renders a clean bordered case-study or studio image with safe fallback if missing. */
export function ShowcaseImage({
  src,
  alt,
  ratio = '16/10',
  className = '',
}: ShowcaseImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const ratioClass = RATIO_CLASSES[ratio];
  const validSrc = src && src !== failedSrc ? src : '';

  const baseWidthClass = /\bw-/.test(className) ? '' : 'w-full';

  if (!validSrc) {
    return (
      <div
        className={`${baseWidthClass} ${ratioClass} rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center px-6 text-center ${className}`.trim()}
      >
        <span className="text-xs font-medium text-slate-500">{alt}</span>
      </div>
    );
  }

  return (
    <div
      className={`${baseWidthClass} ${ratioClass} rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 ${className}`.trim()}
    >
      <img
        src={validSrc}
        alt={alt}
        loading="lazy"
        onError={() => setFailedSrc(validSrc)}
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
}

export interface PortraitAvatarProps {
  src?: string;
  name: string;
  size?: 'md' | 'lg';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Circular portrait avatar with automatic initials/face fallback when no image loads. */
export function PortraitAvatar({ src, name, size = 'md' }: PortraitAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const sizeClass = size === 'lg' ? 'w-12 h-12' : 'w-11 h-11';
  const validSrc = src && src !== failedSrc ? src : '';
  const initials = getInitials(name);

  if (!validSrc) {
    return (
      <div
        aria-hidden="true"
        className={`${sizeClass} rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 text-xs font-semibold`}
      >
        {initials || <User className="w-4 h-4" />}
      </div>
    );
  }

  return (
    <img
      src={validSrc}
      alt={name}
      loading="lazy"
      onError={() => setFailedSrc(validSrc)}
      className={`${sizeClass} rounded-full object-cover object-top ring-1 ring-slate-200 shrink-0 bg-slate-100`}
    />
  );
}
