'use client';
import { cn } from '@/lib/utils';
import { AnimatePresence, Transition, motion } from 'framer-motion';
import {
  Children,
  cloneElement,
  ReactElement,
  ReactNode,
  useState,
  useId,
} from 'react';

type AnimatedBackgroundChildProps = {
  'data-id': string;
  className?: string;
  'data-checked'?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
};

export type AnimatedBackgroundProps = {
  children:
    | ReactElement<AnimatedBackgroundChildProps>[]
    | ReactElement<AnimatedBackgroundChildProps>;
  defaultValue?: string;
  onValueChange?: (newActiveId: string | null) => void;
  className?: string;
  transition?: Transition;
  enableHover?: boolean;
};

export function AnimatedBackground({
  children,
  defaultValue,
  onValueChange,
  className,
  transition,
  enableHover = false,
}: AnimatedBackgroundProps) {
  const [activeId, setActiveId] = useState<string | null>(defaultValue ?? null);
  const [prevDefaultValue, setPrevDefaultValue] = useState(defaultValue);
  const uniqueId = useId();

  if (prevDefaultValue !== defaultValue) {
    setPrevDefaultValue(defaultValue);
    if (defaultValue !== undefined) {
      setActiveId(defaultValue);
    }
  }

  const handleSetActiveId = (id: string | null) => {
    setActiveId(id);

    if (onValueChange) {
      onValueChange(id);
    }
  };

  return Children.map(children, (child: ReactElement<AnimatedBackgroundChildProps & { children?: ReactNode }>, index) => {
    const id = child.props['data-id'];

    const interactionProps = enableHover
      ? {
          onMouseEnter: () => handleSetActiveId(id),
          onMouseLeave: () => handleSetActiveId(null),
        }
      : {
          onClick: () => handleSetActiveId(id),
        };

    return cloneElement(
      child,
      {
        key: index,
        className: cn('relative inline-flex', child.props.className),
        'data-checked': activeId === id ? 'true' : 'false',
        ...interactionProps,
      },
      <>
        <AnimatePresence initial={false}>
          {activeId === id && (
            <motion.div
              layoutId={`background-${uniqueId}`}
              className={cn('absolute inset-0', className)}
              transition={transition}
              initial={{ opacity: defaultValue ? 1 : 0 }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
            />
          )}
        </AnimatePresence>
        <div className='z-10'>{child.props.children}</div>
      </>
    );
  });
}
