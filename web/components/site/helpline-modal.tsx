"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { PhoneCall, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Opens when the helpline reference in the header or footer is clicked.
 * Keeps the page-level chrome uncluttered while still giving people the
 * actual steps for what happens on the call, rather than just a phone icon.
 */
export function HelplineModal({ children }: { children: ReactNode }) {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const trigger = Children.toArray(children).find(isValidElement) as
    | ReactElement<{
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
    type?: "button" | "submit" | "reset";
  }>
    | undefined;

  if (!trigger) {
    return null;
  }

  return (
    <>
      {cloneElement(trigger, {
        ...(trigger.type === "button" && !trigger.props.type ? { type: "button" as const } : {}),
        onClick: (event: ReactMouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) {
            setOpen(true);
          }
        },
      })}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#191F1C]/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md overflow-hidden rounded-none border border-[#C9BFA0] bg-[#F7F3E6] p-0 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#C9BFA0] bg-[#EDE7D3] px-6 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="font-serif text-2xl font-normal text-[#22291F]">
                  {t("helplineModalTitle")}
                </h2>
                <p id={descriptionId} className="mt-1 text-sm text-[#5C5645]">
                  {t("helplineModalSub")}
                </p>
              </div>
              <button
                type="button"
                aria-label={tCommon("close")}
                onClick={() => setOpen(false)}
                className="shrink-0 border border-[#C9BFA0] p-2 text-[#5C5645] transition-colors hover:bg-[#F7F3E6] hover:text-[#22291F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm text-[#3A3D30]">
              <div className="flex items-start gap-3">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5233]" />
                <p>
                  {t("helplineAvail")}
                </p>
              </div>
              <ol className="list-decimal space-y-2.5 pl-5 marker:text-xs marker:text-[#8A8265]">
                <li>{t("helplineStep1")}</li>
                <li>{t("helplineStep2")}</li>
                <li>{t("helplineStep3")}</li>
                <li>{t("helplineStep4")}</li>
              </ol>
              <p className="border-t border-[#C9BFA0]/70 pt-1 text-xs text-[#8A8265]">
                {t("helplineUrgent")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
