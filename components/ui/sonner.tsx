"use client";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!bg-popover !border-border !text-foreground !rounded-lg",
          description: "!text-muted-foreground",
          error: "!border-destructive/50",
          success: "!border-teal/40",
        },
      }}
      {...props}
    />
  );
}
export { Toaster };
