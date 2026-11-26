'use client';

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({
  variant = 'light',
  size = 'md',
  showText = true,
  className = '',
}: LogoProps) {
  // Dimensions for the mark
  const dimensions = {
    sm: { width: 24, height: 31, logoH: 'h-6', text: 'text-base' },
    md: { width: 30, height: 39, logoH: 'h-7', text: 'text-lg' },
    lg: { width: 38, height: 49, logoH: 'h-9', text: 'text-xl' },
  }[size];

  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* 3D Isometric "F" Mark */}
      <div className={`relative flex items-center justify-center shrink-0 ${dimensions.logoH}`}>
        <Image
          src={isDark ? '/logo-dark.png' : '/logo.png'}
          alt="Factual Technologies Logo"
          width={dimensions.width}
          height={dimensions.height}
          priority
          className="object-contain h-full w-auto transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Wordmark */}
      {showText && (
        <div className="flex items-baseline tracking-tight">
          <span
            className={`font-bold transition-colors ${
              isDark ? 'text-white' : 'text-slate-900 group-hover:text-black'
            } ${dimensions.text}`}
          >
            Factual
          </span>
          <span
            className={`font-normal ml-1.5 transition-colors ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            } ${dimensions.text}`}
          >
            Technologies
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;
