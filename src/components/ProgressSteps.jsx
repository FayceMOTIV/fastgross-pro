import { Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProgressSteps({ steps = [], currentStep = 0 }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isPending = index > currentStep

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3"
          >
            {/* Status indicator */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted
                  ? 'bg-brand-500'
                  : isCurrent
                    ? 'bg-brand-500/20 border-2 border-brand-500'
                    : 'bg-dark-800 border border-dark-700'
              }`}
            >
              {isCompleted ? (
                <Check className="w-3.5 h-3.5 text-dark-950" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-dark-600" />
              )}
            </div>

            {/* Step label */}
            <span
              className={`text-sm ${
                isCompleted ? 'text-white' : isCurrent ? 'text-white font-medium' : 'text-dark-500'
              }`}
            >
              {step.label || step}
            </span>

            {/* Progress bar for current step */}
            {isCurrent && step.progress !== undefined && (
              <div className="flex-1 h-1.5 bg-dark-800 rounded-full overflow-hidden ml-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${step.progress}%` }}
                  className="h-full bg-brand-500 rounded-full"
                />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
