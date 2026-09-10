"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelplineModal = HelplineModal;
var lucide_react_1 = require("lucide-react");
var dialog_1 = require("@/components/ui/dialog");
/**
 * Opens when the helpline reference in the header or footer is clicked.
 * Keeps the page-level chrome uncluttered while still giving people the
 * actual steps for what happens on the call, rather than just a phone icon.
 */
function HelplineModal(_a) {
    var children = _a.children;
    return (<dialog_1.Dialog>
      <dialog_1.DialogTrigger asChild>{children}</dialog_1.DialogTrigger>
      <dialog_1.DialogContent className="sm:max-w-md rounded-none border border-[#C9BFA0] bg-[#F7F3E6] p-0 overflow-hidden">
        <div className="border-b border-[#C9BFA0] px-6 py-4 bg-[#EDE7D3]">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle className="font-serif text-2xl text-[#22291F] font-normal">
              Toll-free helpline — 1962
            </dialog_1.DialogTitle>
            <dialog_1.DialogDescription className="text-[#5C5645] text-sm mt-1">
              Livestock Health &amp; Disease Surveillance Network, Department of
              Animal Husbandry
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm text-[#3A3D30]">
          <div className="flex items-start gap-3">
            <lucide_react_1.PhoneCall className="h-4 w-4 mt-0.5 text-[#2F5233] shrink-0"/>
            <p>
              Available every day, including holidays. Calls are answered in
              Marathi, Hindi, and English.
            </p>
          </div>
          <ol className="space-y-2.5 pl-5 list-decimal marker:text-[#8A8265] marker:text-xs">
            <li>Describe what you have observed — lameness, discharge, loss of appetite, or sudden death.</li>
            <li>Share the village and the ear-tag number if the animal is registered.</li>
            <li>A field worker is dispatched, and the case appears on the district's active list.</li>
            <li>You'll get a call back once a veterinarian has reviewed the report.</li>
          </ol>
          <p className="text-xs text-[#8A8265] pt-1 border-t border-[#C9BFA0]/70">
            For a suspected outbreak — several animals affected at once — say so
            first; these calls are routed ahead of the queue.
          </p>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
