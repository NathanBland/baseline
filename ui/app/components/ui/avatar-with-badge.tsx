import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { cn } from "~/lib/utils"

interface AvatarWithBadgeProps {
  src?: string
  fallback: string
  unreadCount?: number
  className?: string
  size?: "sm" | "default" | "lg"
}

const sizeClasses = {
  sm: "h-8 w-8",
  default: "h-10 w-10", 
  lg: "h-12 w-12"
}

const badgeSizeClasses = {
  sm: "h-4 w-4 text-[10px]",
  default: "h-5 w-5 text-xs",
  lg: "h-6 w-6 text-sm"
}

export function AvatarWithBadge({ 
  src, 
  fallback, 
  unreadCount = 0, 
  className,
  size = "default" 
}: AvatarWithBadgeProps) {
  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={src} />
        <AvatarFallback>
          {fallback}
        </AvatarFallback>
      </Avatar>
      
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className={cn(
            "absolute -top-1 -right-1 flex items-center justify-center rounded-full border-2 border-background p-0 min-w-0",
            badgeSizeClasses[size]
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </div>
  )
}
