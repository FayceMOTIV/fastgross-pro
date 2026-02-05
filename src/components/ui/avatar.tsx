"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: "sm" | "md" | "lg" | "xl";
  }
>(({ className, size = "md", ...props }, ref) => {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-primary-100 text-primary-700 font-medium",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

interface UserAvatarProps {
  user: { name: string; avatar?: string };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  status?: "online" | "offline" | "busy";
}

function UserAvatar({ user, size = "md", className, showStatus, status }: UserAvatarProps) {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    busy: "bg-amber-500",
  };

  return (
    <div className="relative">
      <Avatar size={size} className={className}>
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      {showStatus && status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-white",
            statusColors[status],
            size === "sm" ? "h-2 w-2" : size === "md" ? "h-2.5 w-2.5" : "h-3 w-3"
          )}
        />
      )}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar };
