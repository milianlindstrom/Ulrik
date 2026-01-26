'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ConfettiProps {
  trigger: boolean
}

export function Confetti({ trigger }: ConfettiProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (trigger) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  if (!show) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute w-2 h-2 rounded-full animate-confetti",
            i % 5 === 0 && "bg-green-500",
            i % 5 === 1 && "bg-blue-500",
            i % 5 === 2 && "bg-yellow-500",
            i % 5 === 3 && "bg-purple-500",
            i % 5 === 4 && "bg-red-500"
          )}
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${2 + Math.random()}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  )
}
