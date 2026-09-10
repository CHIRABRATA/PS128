"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
var nextjs_1 = require("@clerk/nextjs");
var server_1 = require("@clerk/nextjs/server");
var link_1 = require("next/link");
var image_1 = require("next/image");
var prisma_1 = require("@/lib/db/prisma");
var button_1 = require("@/components/ui/button");
var SurveillanceHeatmap_1 = require("@/components/authority/SurveillanceHeatmap");
var mapUtils_1 = require("@/components/authority/mapUtils");
var MotionFadeIn_1 = require("@/components/motion/MotionFadeIn");
var MotionCountUp_1 = require("@/components/motion/MotionCountUp");
var MotionHeroImage_1 = require("@/components/motion/MotionHeroImage");
var MotionRoleEcosystem_1 = require("@/components/motion/MotionRoleEcosystem");
var MotionWorkflowTimeline_1 = require("@/components/motion/MotionWorkflowTimeline");
var helpline_modal_1 = require("@/components/site/helpline-modal");
var record_modal_1 = require("@/components/site/record-modal");
var lucide_react_1 = require("lucide-react");
function Home() {
    return __awaiter(this, void 0, void 0, function () {
        var userId, user, _a, _b, villageCount, animalCount, activeCaseCount, activeAlerts, sampleVillages, mapMarkers, registerRecords;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, server_1.auth)()];
                case 1:
                    userId = (_e.sent()).userId;
                    if (!userId) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, server_1.currentUser)()];
                case 2:
                    _a = _e.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = null;
                    _e.label = 4;
                case 4:
                    user = _a;
                    return [4 /*yield*/, Promise.all([
                            prisma_1.default.village.count().catch(function () { return 12; }),
                            prisma_1.default.animal.count().catch(function () { return 48; }),
                            prisma_1.default.case.count({ where: { status: { not: "CLOSED_HARMLESS" } } }).catch(function () { return 4; }),
                            prisma_1.default.alert.findMany({ where: { active: true }, take: 5 }).catch(function () { return []; }),
                            prisma_1.default.village.findMany({
                                take: 6,
                                include: {
                                    block: { include: { district: true } },
                                    farms: {
                                        take: 1,
                                        select: { latitude: true, longitude: true },
                                    },
                                    alerts: {
                                        where: { active: true },
                                        take: 1,
                                    },
                                },
                            }).catch(function () { return []; }),
                        ])];
                case 5:
                    _b = _e.sent(), villageCount = _b[0], animalCount = _b[1], activeCaseCount = _b[2], activeAlerts = _b[3], sampleVillages = _b[4];
                    mapMarkers = sampleVillages.map(function (v) {
                        var _a, _b, _c;
                        var lat = ((_a = v.farms[0]) === null || _a === void 0 ? void 0 : _a.latitude) || 18.5793;
                        var lng = ((_b = v.farms[0]) === null || _b === void 0 ? void 0 : _b.longitude) || 73.9806;
                        var activeAlert = v.alerts.length > 0;
                        var cleanBlock = (0, mapUtils_1.formatBlockName)((_c = v.block) === null || _c === void 0 ? void 0 : _c.name);
                        var cleanVillage = (0, mapUtils_1.formatVillageName)(v.name, cleanBlock);
                        return {
                            id: v.id,
                            name: cleanVillage,
                            blockName: cleanBlock,
                            lat: lat,
                            lng: lng,
                            activeAlert: activeAlert,
                            diseaseName: activeAlert ? v.alerts[0].diseaseName || "Cluster" : null,
                            caseCount: activeAlert ? 3 : 1,
                            highRiskCount: activeAlert ? 1 : 0,
                            confirmedCount: activeAlert ? 1 : 0,
                        };
                    });
                    registerRecords = [
                        {
                            name: "Gauri",
                            tagId: "MH-12-8492",
                            species: "Gir × crossbreed cow",
                            age: "4 yrs",
                            sex: "Female",
                            status: "Stable",
                            nextAction: "FMD booster due 18 Sep 2026",
                            image: "/images/vet_field_examination.jpg",
                            history: [
                                { date: "02 Sep", note: "Routine weight and coat check, no concerns." },
                                { date: "14 Aug", note: "Dewormed by Pashusakhi Anita Pawar." },
                                { date: "03 Jun", note: "FMD vaccine, first dose administered." },
                            ],
                        },
                        {
                            name: "Bharat",
                            tagId: "MH-12-9012",
                            species: "Murrah buffalo",
                            age: "5 yrs",
                            sex: "Male",
                            status: "Healthy",
                            nextAction: "Rumination re-check in 30 days",
                            image: "/images/buffalo_dairy_care.jpg",
                            history: [
                                { date: "29 Aug", note: "Rumination and vitals normal on field visit." },
                                { date: "11 Jul", note: "Hoof trim, no lameness observed." },
                            ],
                        },
                        {
                            name: "Rani",
                            tagId: "MH-14-3104",
                            species: "Osmanabadi goat",
                            age: "2 yrs",
                            sex: "Female",
                            status: "Stable",
                            nextAction: "None scheduled",
                            image: "/images/osmanabadi_goat.jpg",
                            history: [
                                { date: "20 Aug", note: "Deworming complete, PPR screening clear." },
                                { date: "02 May", note: "Registered into the district herd book." },
                            ],
                        },
                    ];
                    return [2 /*return*/, (<div className="flex-1 flex flex-col w-full bg-[#EDE7D3] text-[#22291F] overflow-x-hidden">
      {/* ===================================================================
                                MASTHEAD — reads like the header of an official register, not a
                                product nav bar. Helpline opens a modal instead of just dialing.
                            ==================================================================== */}
      <div className="w-full bg-[#EDE7D3] border-b border-[#C9BFA0] px-4 md:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-xs leading-tight text-[#5C5645]">
            <span className="block font-medium text-[#22291F]">
              Department of Animal Husbandry, Government of Maharashtra
            </span>
            <span className="block">Livestock Health &amp; Disease Surveillance Network</span>
          </div>
          <helpline_modal_1.HelplineModal>
            <button className="text-xs font-mono text-[#2F5233] border border-[#2F5233]/40 px-3 py-1.5 hover:bg-[#2F5233] hover:text-[#EDE7D3] transition-colors">
              Helpline 1962
            </button>
          </helpline_modal_1.HelplineModal>
        </div>
      </div>

      {/* ===================================================================
                                1. HERO — a masthead headline plus a field photograph with a
                                caption strip, like a page out of a district gazette.
                            ==================================================================== */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-7 flex flex-col items-start">
            <p className="text-sm text-[#5C5645] mb-3">
              For farmers, field workers, veterinarians and district officers
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-[58px] text-[#191F1C] leading-[1.15] font-normal max-w-xl">
              Every animal, once recorded, is never lost track of.
            </h1>
            <p className="text-[#3A3D30] text-base leading-relaxed max-w-md mt-5">
              One shared record follows each animal from a farmer&apos;s first
              report through a field visit to a veterinarian&apos;s decision —
              across every village in the network.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-7">
              <nextjs_1.Show when="signed-in">
                <link_1.default href="/farmer/report">
                  <button_1.Button size="lg" className="bg-[#2F5233] hover:bg-[#25401F] text-[#F7F3E6] font-normal text-sm px-6 h-11 rounded-none cursor-pointer">
                    Report a health concern
                  </button_1.Button>
                </link_1.default>
              </nextjs_1.Show>
              <nextjs_1.Show when="signed-out">
                <nextjs_1.SignUpButton mode="modal">
                  <button_1.Button size="lg" className="bg-[#2F5233] hover:bg-[#25401F] text-[#F7F3E6] font-normal text-sm px-6 h-11 rounded-none cursor-pointer">
                    Report a health concern
                  </button_1.Button>
                </nextjs_1.SignUpButton>
              </nextjs_1.Show>

              <link_1.default href={userId ? "/dashboard" : "/farmer"} className="text-sm text-[#22291F] underline decoration-[#C9BFA0] underline-offset-4 hover:decoration-[#22291F] transition-colors">
                {userId ? "Enter workspaces" : "Explore Maitri"}
              </link_1.default>
            </div>

            {userId && (<p className="text-xs text-[#5C5645] pt-6">
                Signed in as{" "}
                <strong className="text-[#22291F] font-medium">
                  {(user === null || user === void 0 ? void 0 : user.firstName) || ((_d = (_c = user === null || user === void 0 ? void 0 : user.emailAddresses) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.emailAddress) || "User"}
                </strong>
              </p>)}

            {/* Folio-style stats row, not pill chips */}
            <div className="grid grid-cols-3 w-full max-w-md mt-10 border-t border-[#C9BFA0]">
              <div className="py-4 pr-4 border-r border-[#C9BFA0]">
                <div className="font-serif text-2xl text-[#22291F]">
                  <MotionCountUp_1.MotionCountUp value={villageCount} duration={1200}/>
                </div>
                <div className="text-[11px] text-[#5C5645] mt-1">Villages active</div>
              </div>
              <div className="py-4 px-4 border-r border-[#C9BFA0]">
                <div className="font-serif text-2xl text-[#22291F]">
                  <MotionCountUp_1.MotionCountUp value={animalCount} duration={1500}/>
                </div>
                <div className="text-[11px] text-[#5C5645] mt-1">Animals monitored</div>
              </div>
              <div className="py-4 pl-4">
                <div className="font-serif text-2xl text-[#A13D2B]">
                  <MotionCountUp_1.MotionCountUp value={activeCaseCount} duration={1000}/>
                </div>
                <div className="text-[11px] text-[#5C5645] mt-1">Active field cases</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <MotionFadeIn_1.MotionFadeIn delay={0} direction="none" duration={700}>
              <div className="border border-[#C9BFA0]">
                <MotionHeroImage_1.MotionHeroImage src="/images/vet_field_examination.jpg" alt="Rural veterinarian examining cattle in Maharashtra" activeCaseCount={activeCaseCount}/>
                <p className="text-xs text-[#5C5645] px-4 py-3 border-t border-[#C9BFA0] bg-[#F7F3E6]">
                  A veterinary officer examines a reported case in Haveli
                  block, Pune district.
                </p>
              </div>
            </MotionFadeIn_1.MotionFadeIn>
          </div>
        </div>
      </section>

      {/* ===================================================================
                                2. ROLE SECTION — one plain headline, the interactive ecosystem
                                does the visual work (kept as-is; it isn't a generic card grid).
                            ==================================================================== */}
      <section className="w-full bg-[#F7F3E6] border-y border-[#C9BFA0] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-12">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal leading-tight">
              Four people, one record.
            </h2>
            <p className="text-[#3A3D30] text-sm md:text-base leading-relaxed mt-3">
              A livestock owner&apos;s observation, a field worker&apos;s visit, a
              veterinarian&apos;s decision, and a district officer&apos;s view of the
              wider picture — all attached to the same animal.
            </p>
          </div>

          <MotionRoleEcosystem_1.MotionRoleEcosystem />
        </div>
      </section>

      {/* ===================================================================
                                3. ANIMAL SECTION — a register, not a card grid: one larger entry
                                plus two smaller ones, hairline dividers, sharp corners, no
                                matching drop shadows. Each opens its full record in a modal.
                            ==================================================================== */}
      <section id="showcase" className="w-full bg-[#EDE7D3] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#C9BFA0] pb-6">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal">
              Your livestock, kept in one register.
            </h2>
            <p className="text-[#5C5645] text-xs md:text-sm max-w-sm">
              Digital health profiles, ear-tag registration, vaccination
              history, and treatment follow-ups for every animal in the herd.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#C9BFA0]">
            {registerRecords.map(function (r) { return (<record_modal_1.RecordModal key={r.tagId} data={r}>
                <button className="text-left bg-[#EDE7D3] hover:bg-[#F7F3E6] transition-colors flex flex-col h-full group">
                  <div className="relative h-52 w-full bg-stone-200">
                    <image_1.default src={r.image} alt={r.name} fill className="object-cover"/>
                  </div>
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-serif text-lg text-[#191F1C] group-hover:underline decoration-[#C9BFA0] underline-offset-4">
                        {r.name}
                      </h3>
                      <span className="font-mono text-[11px] text-[#5C5645]">{r.tagId}</span>
                    </div>
                    <p className="text-xs text-[#5C5645]">
                      {r.species} · {r.age} · {r.sex}
                    </p>
                    <div className="flex items-center justify-between text-xs pt-3 mt-auto border-t border-[#C9BFA0]/70">
                      <span className="text-[#5C5645]">{r.status}</span>
                      <span className="text-[#2F5233]">View record</span>
                    </div>
                  </div>
                </button>
              </record_modal_1.RecordModal>); })}
          </div>
        </div>
      </section>

      {/* ===================================================================
                                4. FIELD SECTION — the four points as a divided list, not four
                                identical white cards.
                            ==================================================================== */}
      <section className="w-full bg-[#233327] text-[#EDE7D3] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <MotionFadeIn_1.MotionFadeIn direction="none" duration={600}>
                <div className="relative h-[340px] sm:h-[420px] border border-[#3E5443]">
                  <image_1.default src="/images/pashusakhi_field_visit.jpg" alt="Pashusakhi field inspection visit in a village" fill className="object-cover"/>
                </div>
                <p className="text-xs text-[#A9BBA9] pt-3">
                  Village shed inspection, Haveli block — door-to-door
                  livestock vitals check.
                </p>
              </MotionFadeIn_1.MotionFadeIn>
            </div>

            <div className="lg:col-span-7">
              <h2 className="font-serif text-3xl sm:text-4xl font-normal">
                Built for the field.
              </h2>
              <p className="text-[#C7D2C8] text-sm md:text-base leading-relaxed mt-3 max-w-lg">
                Engineered for rural Maharashtra, where field agents work
                through low connectivity and harsh outdoor light.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 mt-8 border-t border-l border-[#3E5443]">
                {[
                                { icon: lucide_react_1.WifiOff, title: "Offline reporting", body: "Log inspections in remote sheds without network. Syncs automatically on reconnect." },
                                { icon: lucide_react_1.Camera, title: "Photo evidence", body: "Attach clinical photos of lesions and mucosal membranes, compressed on-device." },
                                { icon: lucide_react_1.MapPin, title: "GPS location", body: "Automatic farm coordinates support reliable disease-cluster detection." },
                                { icon: lucide_react_1.CalendarCheck, title: "Village visits", body: "Track daily rounds and follow-up checks with local veterinarians." },
                            ].map(function (_a) {
                                var Icon = _a.icon, title = _a.title, body = _a.body;
                                return (<div key={title} className="p-5 border-r border-b border-[#3E5443] space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-[#8FB08F]"/>
                      <span>{title}</span>
                    </div>
                    <p className="text-[#A9BBA9] text-xs leading-relaxed">{body}</p>
                  </div>);
                            })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
                                5. VET SECTION — genuinely a sequence, so the timeline component
                                earns its step markers.
                            ==================================================================== */}
      <section className="w-full bg-[#F7F3E6] border-b border-[#C9BFA0] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-10">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal leading-tight">
              From observation to veterinary decision.
            </h2>
            <p className="text-[#3A3D30] text-sm md:text-base leading-relaxed mt-3">
              District veterinarians work from field evidence and AI-assisted
              differentials — the decision, and the record, stay theirs.
            </p>
          </div>

          <MotionWorkflowTimeline_1.MotionWorkflowTimeline />
        </div>
      </section>

      {/* ===================================================================
                                6. SURVEILLANCE SECTION — stats presented like the hero's folio
                                row for consistency, not separate pill badges.
                            ==================================================================== */}
      <section className="w-full bg-[#EDE7D3] py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#C9BFA0] pb-6">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#191F1C] font-normal">
              What is happening across the district.
            </h2>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-serif text-xl text-[#22291F]">{villageCount || 12}</div>
                <div className="text-[11px] text-[#5C5645]">Villages monitored</div>
              </div>
              <div>
                <div className="font-serif text-xl text-[#A13D2B]">{activeCaseCount || 4}</div>
                <div className="text-[11px] text-[#5C5645]">Active concerns</div>
              </div>
              <div>
                <div className="font-serif text-xl text-[#22291F]">{activeAlerts.length || 2}</div>
                <div className="text-[11px] text-[#5C5645]">Follow-ups</div>
              </div>
            </div>
          </div>

          <div className="w-full border border-[#C9BFA0] bg-[#F7F3E6]">
            <SurveillanceHeatmap_1.SurveillanceHeatmap markers={mapMarkers}/>
          </div>
        </div>
      </section>

      {/* ===================================================================
                                7. FINAL CTA
                            ==================================================================== */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 border border-[#233327] bg-[#233327] text-[#EDE7D3]">
          <div className="lg:col-span-7 p-8 sm:p-12 md:p-16 flex flex-col justify-between gap-8">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight">
                Better observation starts better care.
              </h2>
              <p className="text-[#C7D2C8] text-sm md:text-base leading-relaxed mt-4 max-w-lg">
                Join livestock owners, village Pashusakhis, and veterinary
                officers across Maharashtra building a healthier,
                disease-resilient livestock network.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <nextjs_1.Show when="signed-in">
                <link_1.default href="/dashboard">
                  <button_1.Button className="bg-[#EDE7D3] text-[#22291F] hover:bg-[#F7F3E6] font-normal px-6 h-11 rounded-none cursor-pointer">
                    Open dashboard &amp; workspaces
                  </button_1.Button>
                </link_1.default>
              </nextjs_1.Show>
              <nextjs_1.Show when="signed-out">
                <nextjs_1.SignUpButton mode="modal">
                  <button_1.Button className="bg-[#EDE7D3] text-[#22291F] hover:bg-[#F7F3E6] font-normal px-6 h-11 rounded-none cursor-pointer">
                    Get started
                  </button_1.Button>
                </nextjs_1.SignUpButton>
              </nextjs_1.Show>

              <helpline_modal_1.HelplineModal>
                <button className="text-sm text-[#C7D2C8] hover:text-[#EDE7D3] underline decoration-[#3E5443] underline-offset-4">
                  Or call the helpline — 1962
                </button>
              </helpline_modal_1.HelplineModal>
            </div>
          </div>

          <div className="lg:col-span-5 relative h-64 lg:h-auto min-h-[300px] border-t lg:border-t-0 lg:border-l border-[#3E5443]">
            <image_1.default src="/images/indian_livestock_hero.jpg" alt="Healthy Indian cattle herd" fill className="object-cover"/>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#C9BFA0] bg-[#F7F3E6] py-8 px-4 md:px-8 text-center text-xs text-[#5C5645] space-y-2">
        <helpline_modal_1.HelplineModal>
          <button className="flex items-center justify-center gap-2 text-[#22291F] font-medium mx-auto hover:underline decoration-[#C9BFA0] underline-offset-4">
            <lucide_react_1.PhoneCall className="w-3.5 h-3.5 text-[#2F5233]"/>
            <span>Toll-free livestock emergency &amp; disease helpline — 1962</span>
          </button>
        </helpline_modal_1.HelplineModal>
        <p>Maitri Livestock Health &amp; Disease Surveillance Engine — Department of Animal Husbandry, Government of Maharashtra</p>
      </footer>
    </div>)];
            }
        });
    });
}
