import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export function TooltipProvider({ children }) {
  return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>
}

export function Tooltip({ children, content, side = 'top' }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={5}
          className="z-50 px-3 py-1.5 text-xs font-medium text-white bg-dark-800 rounded-lg border border-dark-700 shadow-lg animate-fade-in"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-dark-800" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
