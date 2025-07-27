import { useConnectionStore, ConnectionStatus } from '~/lib/stores/connection-store'
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { motion } from 'framer-motion'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"

interface ConnectionIndicatorProps {
  className?: string
  showLabel?: boolean
  variant?: 'banner' | 'dot'
}

const getStatusConfig = (status: ConnectionStatus, reconnectAttempts: number) => {
  switch (status) {
    case 'connected':
      return {
        icon: Wifi,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        label: 'Connected',
        pulse: false
      }
    case 'connecting':
      return {
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Connecting...',
        pulse: true
      }
    case 'reconnecting':
      return {
        icon: RefreshCw,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        label: `Reconnecting (${reconnectAttempts})...`,
        pulse: true
      }
    case 'disconnected':
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Disconnected',
        pulse: false
      }
    case 'error':
      return {
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Connection Error',
        pulse: false
      }
    default:
      return {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        label: 'Unknown',
        pulse: false
      }
  }
}

export function ConnectionIndicator({ className, showLabel = false, variant = 'banner' }: ConnectionIndicatorProps) {
  const { status, reconnectAttempts, nextReconnectAt, lastError } = useConnectionStore()
  
  const config = getStatusConfig(status, reconnectAttempts)
  const Icon = config.icon
  
  // Calculate time until next reconnect
  const timeUntilReconnect = nextReconnectAt ? 
    Math.max(0, Math.ceil((nextReconnectAt.getTime() - Date.now()) / 1000)) : 0

  // Build tooltip content for dot variant
  const tooltipContent = (
    <div className="text-sm">
      <div className={cn('font-medium', config.color)}>
        {config.label}
      </div>
      {status === 'reconnecting' && timeUntilReconnect > 0 && (
        <div className="text-xs text-gray-400 mt-1">
          Next attempt in {timeUntilReconnect}s
        </div>
      )}
      {lastError && status === 'error' && (
        <div className="text-xs text-red-400 mt-1 max-w-[200px]">
          {lastError}
        </div>
      )}
    </div>
  )

  // Dot variant - small colored dot with tooltip
  if (variant === 'dot') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('relative cursor-help', className)}>
              <motion.div
                animate={{ 
                  backgroundColor: config.color.includes('green') ? '#10b981' :
                                 config.color.includes('blue') ? '#3b82f6' :
                                 config.color.includes('orange') ? '#f59e0b' :
                                 config.color.includes('red') ? '#ef4444' : '#6b7280'
                }}
                transition={{ duration: 0.3 }}
                className="w-2 h-2 rounded-full"
              />
              {config.pulse && (
                <motion.div
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.7, 0, 0.7]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: config.color.includes('green') ? '#10b981' :
                                   config.color.includes('blue') ? '#3b82f6' :
                                   config.color.includes('orange') ? '#f59e0b' :
                                   config.color.includes('red') ? '#ef4444' : '#6b7280'
                  }}
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Banner variant - original layout
  return (
    <div className={cn(
      'flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200',
      config.bgColor,
      className
    )}>
      <div className="relative">
        <Icon 
          className={cn(
            'h-4 w-4 transition-all duration-200',
            config.color,
            config.pulse && 'animate-spin',
            status === 'reconnecting' && 'animate-spin'
          )}
        />
        {config.pulse && status !== 'reconnecting' && (
          <div className={cn(
            'absolute inset-0 rounded-full animate-ping',
            config.color.replace('text-', 'bg-'),
            'opacity-20'
          )} />
        )}
      </div>
      
      {showLabel && (
        <div className="flex flex-col min-w-0">
          <span className={cn(
            'text-xs font-medium truncate',
            config.color
          )}>
            {config.label}
          </span>
          
          {/* Show countdown for reconnecting */}
          {status === 'reconnecting' && timeUntilReconnect > 0 && (
            <span className="text-xs text-gray-500">
              {timeUntilReconnect}s
            </span>
          )}
          
          {/* Show error message */}
          {lastError && status === 'error' && (
            <span className="text-xs text-red-400 truncate max-w-[200px]" title={lastError}>
              {lastError}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function ConnectionBanner() {
  const { status, isConnected, lastError } = useConnectionStore()
  
  // Only show banner for error or disconnected states
  if (isConnected || status === 'connecting') {
    return null
  }
  
  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium',
      'transition-all duration-300 transform',
      status === 'error' || status === 'disconnected' 
        ? 'translate-y-0 bg-red-500 text-white' 
        : 'translate-y-0 bg-orange-500 text-white'
    )}>
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>
          {status === 'reconnecting' 
            ? 'Reconnecting to server...' 
            : 'Connection lost. Messages will be retried when reconnected.'
          }
        </span>
        {lastError && (
          <span className="opacity-75">({lastError})</span>
        )}
      </div>
    </div>
  )
}
