import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      offset={16}
      gap={8}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border-0 group-[.toaster]:shadow-xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:px-4 group-[.toaster]:py-3.5 group-[.toaster]:text-sm group-[.toaster]:font-body group-[.toaster]:gap-3",
          description: "group-[.toast]:text-white/60 group-[.toast]:text-xs group-[.toast]:leading-relaxed",
          actionButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:font-semibold",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white/60 group-[.toast]:rounded-xl",
          success:
            "group-[.toaster]:bg-emerald-950/90 group-[.toaster]:text-emerald-100 group-[.toaster]:border group-[.toaster]:border-emerald-800/30",
          error:
            "group-[.toaster]:bg-red-950/90 group-[.toaster]:text-red-100 group-[.toaster]:border group-[.toaster]:border-red-800/30",
          warning:
            "group-[.toaster]:bg-amber-950/90 group-[.toaster]:text-amber-100 group-[.toaster]:border group-[.toaster]:border-amber-800/30",
          info:
            "group-[.toaster]:bg-sky-950/90 group-[.toaster]:text-sky-100 group-[.toaster]:border group-[.toaster]:border-sky-800/30",
          default:
            "group-[.toaster]:bg-[hsl(180,10%,10%)]/90 group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-white/10",
        },
      }}
      icons={{
        success: <span className="text-emerald-400 text-base">✓</span>,
        error: <span className="text-red-400 text-base">✕</span>,
        warning: <span className="text-amber-400 text-base">⚠</span>,
        info: <span className="text-sky-400 text-base">ℹ</span>,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
