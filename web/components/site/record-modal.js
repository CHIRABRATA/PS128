"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordModal = RecordModal;
var dialog_1 = require("@/components/ui/dialog");
/**
 * Wraps a register row/card. Clicking it opens the animal's fuller record —
 * a small, focused preview rather than navigating away from the page.
 */
function RecordModal(_a) {
    var data = _a.data, children = _a.children;
    return (<dialog_1.Dialog>
      <dialog_1.DialogTrigger asChild>{children}</dialog_1.DialogTrigger>
      <dialog_1.DialogContent className="sm:max-w-lg rounded-none border border-[#C9BFA0] bg-[#F7F3E6] p-0 overflow-hidden">
        <div className="border-b border-[#C9BFA0] px-6 py-4 bg-[#EDE7D3] flex items-baseline justify-between">
          <dialog_1.DialogHeader className="space-y-1">
            <dialog_1.DialogTitle className="font-serif text-2xl text-[#22291F] font-normal">
              {data.name}
            </dialog_1.DialogTitle>
            <dialog_1.DialogDescription className="text-[#5C5645] text-sm">
              {data.species} · {data.age} · {data.sex}
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <span className="font-mono text-xs text-[#5C5645] border border-[#C9BFA0] px-2 py-1 shrink-0">
            {data.tagId}
          </span>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm text-[#3A3D30]">
          <div className="flex items-center justify-between border-b border-[#C9BFA0]/70 pb-3">
            <span className="text-[#5C5645]">Current status</span>
            <span className="font-medium text-[#22291F]">{data.status}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[#C9BFA0]/70 pb-3">
            <span className="text-[#5C5645]">Next action</span>
            <span className="font-medium text-[#22291F]">{data.nextAction}</span>
          </div>

          <div>
            <p className="text-xs text-[#8A8265] mb-2">Recent history</p>
            <ul className="space-y-2">
              {data.history.map(function (h, i) { return (<li key={i} className="flex gap-3 text-xs">
                  <span className="font-mono text-[#8A8265] shrink-0 w-20">
                    {h.date}
                  </span>
                  <span className="text-[#3A3D30]">{h.note}</span>
                </li>); })}
            </ul>
          </div>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
