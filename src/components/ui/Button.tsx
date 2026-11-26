'use client';

import React from 'react';
import Link from 'next/link';
import { sanitizeSafeUrl } from '@/lib/admin-types';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'inverted' | 'outline-dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  target?: string;
  rel?: string;
}

const baseStyles =
  'font-button font-medium transition-all duration-150 inline-flex items-center justify-center gap-2 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [touch-action:manipulation]';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 text-white hover:bg-black rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)]',
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200/90 rounded-full',
  outline:
    'bg-white border border-slate-200/80 text-slate-800 hover:bg-slate-50 hover:border-slate-300 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
  ghost:
    'bg-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-100/70 rounded-full',
  inverted:
    'bg-white text-slate-950 hover:bg-slate-100 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
  'outline-dark':
    'bg-transparent border border-slate-700/80 text-slate-200 hover:bg-slate-900 hover:text-white rounded-full',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs sm:text-sm min-h-[44px]',
  md: 'px-6 py-2.5 text-[15px] sm:text-base min-h-[44px]',
  lg: 'px-7 py-3 text-base min-h-[48px]',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  className = '',
  onClick,
  icon,
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();
  const renderedIcon = icon ?? null;

  if (href) {
    return (
      <Link
        href={sanitizeSafeUrl(href, '/')}
        className={combinedClassName}
        onClick={onClick}
        {...props}
      >
        {children}
        {renderedIcon}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={combinedClassName}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
      {renderedIcon}
    </button>
  );
}

export default Button;
