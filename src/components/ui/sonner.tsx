import * as React from "react";
import { Toaster as SonnerToaster, toast } from "sonner";

export type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export const Toaster: React.FC<ToasterProps> = ({ position, ...props }) => {
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toastPosition = position || (isMobile ? "top-center" : "bottom-right");

  return (
    <SonnerToaster
      theme="light"
      richColors
      closeButton
      position={toastPosition}
      className="toaster group z-[999999]"
      style={{ zIndex: 999999 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-lg",
          error:
            "group-[.toaster]:!bg-white group-[.toaster]:!border-slate-200 group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-red-600 group-[.toaster]:!text-slate-900",
          success:
            "group-[.toaster]:!bg-white group-[.toaster]:!border-slate-200 group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-emerald-600 group-[.toaster]:!text-slate-900",
          description: "group-[.toast]:text-slate-600",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-700",
          closeButton:
            "group-[.toast]:text-slate-400 group-[.toast]:hover:text-slate-700",
        },
      }}
      {...props}
    />
  );
};

export { toast };
