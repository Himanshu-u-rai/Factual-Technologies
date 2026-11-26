'use client';
import { cn } from '@/lib/utils';
import { useMotionValue, animate, motion } from 'framer-motion';
import { useEffect, useReducer } from 'react';
import useMeasure from 'react-use-measure';

export type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  speed?: number;
  speedOnHover?: number;
  direction?: 'horizontal' | 'vertical';
  reverse?: boolean;
  className?: string;
};

type SliderState =
  | { phase: 'looping'; isHovered: boolean; loopEpoch: number }
  | { phase: 'easing'; isHovered: boolean; loopEpoch: number };

type SliderAction =
  | { type: 'HOVER_START' }
  | { type: 'HOVER_END' }
  | { type: 'TRANSITION_COMPLETE' };

function sliderReducer(state: SliderState, action: SliderAction): SliderState {
  switch (action.type) {
    case 'HOVER_START':
      return { phase: 'easing', isHovered: true, loopEpoch: state.loopEpoch };
    case 'HOVER_END':
      return { phase: 'easing', isHovered: false, loopEpoch: state.loopEpoch };
    case 'TRANSITION_COMPLETE':
      return { phase: 'looping', isHovered: state.isHovered, loopEpoch: state.loopEpoch + 1 };
  }
}

export function InfiniteSlider({
  children,
  gap = 16,
  speed = 100,
  speedOnHover,
  direction = 'horizontal',
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [sliderState, dispatch] = useReducer(sliderReducer, {
    phase: 'looping',
    isHovered: false,
    loopEpoch: 0,
  });
  const currentSpeed = Math.max(
    0.001,
    sliderState.isHovered && speedOnHover ? speedOnHover : speed
  );
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);

  useEffect(() => {
    let controls;
    const size = direction === 'horizontal' ? width : height;
    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;

    const distanceToTravel = Math.abs(to - from);
    const duration = distanceToTravel / currentSpeed;

    if (sliderState.phase === 'easing') {
      const remainingDistance = Math.abs(translation.get() - to);
      const transitionDuration = remainingDistance / currentSpeed;

      controls = animate(translation, [translation.get(), to], {
        ease: 'linear',
        duration: transitionDuration,
        onComplete: () => {
          dispatch({ type: 'TRANSITION_COMPLETE' });
        },
      });
    } else {
      controls = animate(translation, [from, to], {
        ease: 'linear',
        duration: duration,
        repeat: Infinity,
        repeatType: 'loop',
        repeatDelay: 0,
        onRepeat: () => {
          translation.set(from);
        },
      });
    }

    return controls?.stop;
  }, [
    sliderState.loopEpoch,
    sliderState.phase,
    translation,
    currentSpeed,
    width,
    height,
    gap,
    direction,
    reverse,
  ]);

  const hoverProps = speedOnHover
    ? {
        onHoverStart: () => dispatch({ type: 'HOVER_START' }),
        onHoverEnd: () => dispatch({ type: 'HOVER_END' }),
      }
    : {};

  return (
    <div className={cn('overflow-hidden py-3', className)}>
      <motion.div
        className='flex w-max items-center py-2'
        style={{
          ...(direction === 'horizontal'
            ? { x: translation }
            : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
