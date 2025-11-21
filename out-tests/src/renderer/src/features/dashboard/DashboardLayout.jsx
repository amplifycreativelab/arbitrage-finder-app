"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const ProviderSettings_1 = __importDefault(require("../settings/ProviderSettings"));
const FeedPane_1 = __importDefault(require("./FeedPane"));
function DashboardLayout({ feed, signalPreview }) {
    return (<div className="flex flex-1 gap-4 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-4" data-testid="dashboard-layout">
      <section aria-label="Feed" className="flex w-[380px] min-w-[360px] max-w-[440px] flex-col gap-3 border-r border-white/10 pr-4" data-testid="feed-pane">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
            Feed
          </h2>
          <span className="text-[10px] text-ot-foreground/60">Opportunities</span>
        </header>

        <div className="flex-1 rounded-md border border-white/10 bg-black/40 p-3 text-[11px] text-ot-foreground/70">
          {feed ?? <FeedPane_1.default />}
        </div>
      </section>

      <section aria-label="Signal preview and settings" className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex-1 rounded-md border border-white/10 bg-black/40 p-3" data-testid="signal-preview-pane">
          <header className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
              Signal Preview
            </h2>
            <span className="text-[10px] text-ot-foreground/60">Layout shell</span>
          </header>

          <div className="mt-2 flex h-full flex-col rounded-md border border-white/10 bg-black/60 p-3 text-[11px] font-mono text-ot-foreground/80">
            {signalPreview ?? (<>
                <p>Bet365 (Full)</p>
                <p>Calcio 21/11</p>
                <p>21:00 Preston - Blackburn</p>
                <p>England Championship Rigori: SA?</p>
                <p>4.50</p>
                <p className="mt-2">--- break ---</p>
                <p>Staryes (IT)</p>
                <p>Calcio 21/11</p>
                <p>21:00 Preston - Blackburn</p>
                <p>Inghilterra - Championship Rigori: No</p>
                <p>1.32</p>
              </>)}
          </div>
        </div>

        <section className="rounded-md border border-white/10 bg-black/40 p-3">
          <ProviderSettings_1.default />
        </section>
      </section>
    </div>);
}
exports.default = DashboardLayout;
