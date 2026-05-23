"use client"

import {
  CircleAlert,
  CircleCheck,
  Info,
  Loader2,
  TriangleAlert,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset={20}
      gap={8}
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast: `
            !bg-card/95 !backdrop-blur-md
            !border !border-border/50 
            !shadow-lg !shadow-black/5
            !rounded-2xl !py-3 !px-4 !gap-3
            !min-w-[280px] !max-w-[360px]
          `,
          title: "!text-foreground !font-medium !text-sm",
          description: "!text-muted-foreground !text-xs !mt-0.5",
          success: "!border-l-4 !border-l-emerald-500 !bg-emerald-500/5",
          error: "!border-l-4 !border-l-red-500 !bg-red-500/5",
          warning: "!border-l-4 !border-l-amber-500 !bg-amber-500/5",
          info: "!border-l-4 !border-l-blue-500 !bg-blue-500/5",
          loading: "!border-l-4 !border-l-primary !bg-primary/5",
        },
        duration: 3000,
      }}
      icons={{
        success: <CircleCheck className="size-5 text-emerald-500" />,
        info: <Info className="size-5 text-blue-500" />,
        warning: <TriangleAlert className="size-5 text-amber-500" />,
        error: <CircleAlert className="size-5 text-red-500" />,
        loading: <Loader2 className="size-5 text-primary animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
