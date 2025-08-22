import { useCallback, useEffect, useRef, useState } from 'react'

// Animation types and configurations
export interface AnimationConfig {
  duration?: number
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce'
  delay?: number
  onComplete?: () => void
  onUpdate?: (value: number) => void
}

export interface NumberAnimationConfig extends AnimationConfig {
  from: number
  to: number
  decimals?: number
  format?: 'currency' | 'percentage' | 'number'
}

export interface ChartAnimationConfig extends AnimationConfig {
  type: 'fade' | 'slide' | 'scale' | 'stagger'
  staggerDelay?: number
}

// Easing functions
const easingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    }
  }
}

// Core animation engine
class AnimationEngine {
  private activeAnimations = new Map<string, any>()
  private rafId: number | null = null

  animate(
    id: string,
    config: AnimationConfig & { update: (progress: number) => void }
  ): Promise<void> {
    return new Promise((resolve) => {
      // Cancel existing animation with same ID
      this.cancel(id)

      const startTime = performance.now()
      const duration = config.duration || 300
      const easing = easingFunctions[config.easing || 'easeOut']
      const delay = config.delay || 0

      const animation = {
        id,
        startTime: startTime + delay,
        duration,
        easing,
        update: config.update,
        onComplete: () => {
          this.activeAnimations.delete(id)
          config.onComplete?.()
          resolve()
        }
      }

      this.activeAnimations.set(id, animation)
      this.startAnimationLoop()
    })
  }

  cancel(id: string): void {
    this.activeAnimations.delete(id)
    if (this.activeAnimations.size === 0 && this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  cancelAll(): void {
    this.activeAnimations.clear()
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private startAnimationLoop(): void {
    if (this.rafId) return

    const loop = (currentTime: number) => {
      const animationsToComplete: any[] = []

      Array.from(this.activeAnimations.values()).forEach(animation => {
        if (currentTime < animation.startTime) return

        const elapsed = currentTime - animation.startTime
        const progress = Math.min(elapsed / animation.duration, 1)
        const easedProgress = animation.easing(progress)

        animation.update(easedProgress)

        if (progress >= 1) {
          animationsToComplete.push(animation)
        }
      })

      // Complete finished animations
      animationsToComplete.forEach(animation => {
        animation.onComplete()
      })

      if (this.activeAnimations.size > 0) {
        this.rafId = requestAnimationFrame(loop)
      } else {
        this.rafId = null
      }
    }

    this.rafId = requestAnimationFrame(loop)
  }
}

const animationEngine = new AnimationEngine()

// React hooks for animations
export const useNumberAnimation = (
  target: number,
  config: Omit<NumberAnimationConfig, 'to'> = { from: 0 }
) => {
  const [current, setCurrent] = useState(config.from || 0)
  const previousTarget = useRef(target)

  useEffect(() => {
    if (target === previousTarget.current) return

    const from = current
    const to = target
    const decimals = config.decimals ?? 2
    
    animationEngine.animate(`number-${Math.random()}`, {
      duration: config.duration || 800,
      easing: config.easing || 'easeOut',
      delay: config.delay || 0,
      update: (progress) => {
        const value = from + (to - from) * progress
        setCurrent(Number(value.toFixed(decimals)))
        config.onUpdate?.(value)
      },
      onComplete: config.onComplete
    })

    previousTarget.current = target
  }, [target, config.duration, config.easing, config.delay, current])

  const formatValue = useCallback((value: number) => {
    const decimals = config.decimals ?? 2
    
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value)
      case 'percentage':
        return `${value.toFixed(decimals)}%`
      default:
        return value.toFixed(decimals)
    }
  }, [config.format, config.decimals])

  return formatValue(current)
}

export const useCountUp = (target: number, options: Omit<NumberAnimationConfig, 'to'> = { from: 0 }) => {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    animationEngine.animate(`countup-${Math.random()}`, {
      duration: options.duration || 1000,
      easing: options.easing || 'easeOut',
      delay: options.delay || 0,
      update: (progress) => {
        setCurrent(target * progress)
      },
      onComplete: options.onComplete
    })
  }, [target, options.duration, options.easing, options.delay])

  return Math.round(current)
}

export const useSlideIn = (isVisible: boolean, direction: 'left' | 'right' | 'up' | 'down' = 'up') => {
  const [style, setStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: getInitialTransform(direction)
  })

  useEffect(() => {
    if (isVisible) {
      animationEngine.animate(`slide-${Math.random()}`, {
        duration: 500,
        easing: 'easeOut',
        update: (progress) => {
          setStyle({
            opacity: progress,
            transform: `translate3d(${getTranslateX(direction, progress)}, ${getTranslateY(direction, progress)}, 0)`
          })
        }
      })
    }
  }, [isVisible, direction])

  return style
}

export const useFadeIn = (isVisible: boolean, delay = 0) => {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (isVisible) {
      animationEngine.animate(`fade-${Math.random()}`, {
        duration: 400,
        easing: 'easeOut',
        delay,
        update: (progress) => {
          setOpacity(progress)
        }
      })
    }
  }, [isVisible, delay])

  return { opacity }
}

export const useStaggeredAnimation = (items: any[], delay = 100) => {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    items.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems(prev => new Set(Array.from(prev).concat([index])))
      }, index * delay)
    })
  }, [items, delay])

  return visibleItems
}

export const usePulse = (isActive: boolean) => {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!isActive) return

    const pulseAnimation = () => {
      animationEngine.animate(`pulse-${Math.random()}`, {
        duration: 1000,
        easing: 'easeInOut',
        update: (progress) => {
          setScale(1 + Math.sin(progress * Math.PI) * 0.1)
        },
        onComplete: () => {
          if (isActive) {
            setTimeout(pulseAnimation, 100)
          }
        }
      })
    }

    pulseAnimation()
  }, [isActive])

  return { transform: `scale(${scale})` }
}

export const useShimmer = (isLoading: boolean) => {
  const [position, setPosition] = useState(-100)

  useEffect(() => {
    if (!isLoading) return

    const shimmerAnimation = () => {
      animationEngine.animate(`shimmer-${Math.random()}`, {
        duration: 1500,
        easing: 'linear',
        update: (progress) => {
          setPosition(-100 + progress * 200)
        },
        onComplete: () => {
          if (isLoading) {
            setTimeout(shimmerAnimation, 500)
          }
        }
      })
    }

    shimmerAnimation()
  }, [isLoading])

  return {
    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
    transform: `translateX(${position}%)`
  }
}

// Chart animation helpers
export const useChartAnimation = (data: any[], config: ChartAnimationConfig = { type: 'fade' }) => {
  const [animatedData, setAnimatedData] = useState<any[]>([])
  const previousData = useRef<any[]>([])

  useEffect(() => {
    if (JSON.stringify(data) === JSON.stringify(previousData.current)) return

    switch (config.type) {
      case 'stagger':
        // Animate each data point with delay
        data.forEach((item, index) => {
          setTimeout(() => {
            setAnimatedData(prev => [...prev.slice(0, index), item, ...prev.slice(index + 1)])
          }, (config.staggerDelay || 100) * index)
        })
        break

      case 'scale':
        // Scale animation from 0 to full size
        animationEngine.animate(`chart-scale-${Math.random()}`, {
          duration: config.duration || 800,
          easing: config.easing || 'easeOut',
          update: (progress) => {
            setAnimatedData(data.map(item => ({
              ...item,
              value: typeof item.value === 'number' ? item.value * progress : item.value
            })))
          }
        })
        break

      default:
        // Fade animation
        setAnimatedData(data)
    }

    previousData.current = data
  }, [data, config.type, config.duration, config.easing, config.staggerDelay])

  return animatedData
}

// Performance optimization
export const useThrottledAnimation = (callback: () => void, delay = 16) => {
  const lastRun = useRef(Date.now())

  return useCallback(() => {
    if (Date.now() - lastRun.current >= delay) {
      callback()
      lastRun.current = Date.now()
    }
  }, [callback, delay])
}

// Utility functions
function getInitialTransform(direction: string): string {
  switch (direction) {
    case 'left': return 'translate3d(-100%, 0, 0)'
    case 'right': return 'translate3d(100%, 0, 0)'
    case 'up': return 'translate3d(0, -100%, 0)'
    case 'down': return 'translate3d(0, 100%, 0)'
    default: return 'translate3d(0, -100%, 0)'
  }
}

function getTranslateX(direction: string, progress: number): string {
  switch (direction) {
    case 'left': return `${-100 + progress * 100}%`
    case 'right': return `${100 - progress * 100}%`
    default: return '0'
  }
}

function getTranslateY(direction: string, progress: number): string {
  switch (direction) {
    case 'up': return `${-100 + progress * 100}%`
    case 'down': return `${100 - progress * 100}%`
    default: return '0'
  }
}

// Export animation engine for direct use
export { animationEngine }

// Real-time value monitoring
export const useRealTimeValue = <T>(
  value: T,
  animationConfig: AnimationConfig = {}
) => {
  const [animatedValue, setAnimatedValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value === animatedValue) return

    setIsAnimating(true)
    
    // For numbers, animate the transition
    if (typeof value === 'number' && typeof animatedValue === 'number') {
      animationEngine.animate(`realtime-${Math.random()}`, {
        duration: animationConfig.duration || 500,
        easing: animationConfig.easing || 'easeOut',
        update: (progress) => {
          const current = animatedValue + (value - animatedValue) * progress
          setAnimatedValue(current as T)
        },
        onComplete: () => {
          setIsAnimating(false)
          animationConfig.onComplete?.()
        }
      })
    } else {
      // For non-numbers, just update with delay
      setTimeout(() => {
        setAnimatedValue(value)
        setIsAnimating(false)
        animationConfig.onComplete?.()
      }, animationConfig.delay || 0)
    }
  }, [value, animatedValue, animationConfig.duration, animationConfig.easing, animationConfig.delay])

  return { value: animatedValue, isAnimating }
}
