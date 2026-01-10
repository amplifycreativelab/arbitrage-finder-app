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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandSeparator = exports.CommandItem = exports.CommandGroup = exports.CommandEmpty = exports.CommandList = exports.CommandInput = exports.Command = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const cmdk_1 = require("cmdk");
const utils_1 = require("../../lib/utils");
const Command = React.forwardRef(({ className, ...props }, ref) => ((0, jsx_runtime_1.jsx)(cmdk_1.Command, { ref: ref, className: (0, utils_1.cn)('flex h-full w-full flex-col overflow-hidden rounded-md bg-ot-bg text-ot-foreground', className), ...props })));
exports.Command = Command;
Command.displayName = cmdk_1.Command.displayName;
const CommandInput = React.forwardRef(({ className, ...props }, ref) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center border-b border-white/10 px-3", "cmdk-input-wrapper": "", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "mr-2 h-4 w-4 shrink-0 opacity-50", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "11", cy: "11", r: "8" }), (0, jsx_runtime_1.jsx)("path", { d: "m21 21-4.3-4.3" })] }), (0, jsx_runtime_1.jsx)(cmdk_1.Command.Input, { ref: ref, className: (0, utils_1.cn)('flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none', 'placeholder:text-ot-foreground/50 disabled:cursor-not-allowed disabled:opacity-50', className), ...props })] })));
exports.CommandInput = CommandInput;
CommandInput.displayName = cmdk_1.Command.Input.displayName;
const CommandList = React.forwardRef(({ className, ...props }, ref) => ((0, jsx_runtime_1.jsx)(cmdk_1.Command.List, { ref: ref, className: (0, utils_1.cn)('max-h-[300px] overflow-y-auto overflow-x-hidden', className), ...props })));
exports.CommandList = CommandList;
CommandList.displayName = cmdk_1.Command.List.displayName;
const CommandEmpty = React.forwardRef((props, ref) => ((0, jsx_runtime_1.jsx)(cmdk_1.Command.Empty, { ref: ref, className: "py-6 text-center text-sm text-ot-foreground/60", ...props })));
exports.CommandEmpty = CommandEmpty;
CommandEmpty.displayName = cmdk_1.Command.Empty.displayName;
const CommandGroup = React.forwardRef(({ className, ...props }, ref) => ((0, jsx_runtime_1.jsx)(cmdk_1.Command.Group, { ref: ref, className: (0, utils_1.cn)('overflow-hidden p-1 text-ot-foreground', '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5', '[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ot-foreground/60', className), ...props })));
exports.CommandGroup = CommandGroup;
CommandGroup.displayName = cmdk_1.Command.Group.displayName;
const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => ((0, jsx_runtime_1.jsx)(cmdk_1.Command.Separator, { ref: ref, className: (0, utils_1.cn)('-mx-1 h-px bg-white/10', className), ...props })));
exports.CommandSeparator = CommandSeparator;
CommandSeparator.displayName = cmdk_1.Command.Separator.displayName;
const CommandItem = React.forwardRef(({ className, ...props }, ref) => ((0, jsx_runtime_1.jsx)(cmdk_1.Command.Item, { ref: ref, className: (0, utils_1.cn)('relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none', 'aria-selected:bg-ot-accent/20 aria-selected:text-ot-accent', 'data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className), ...props })));
exports.CommandItem = CommandItem;
CommandItem.displayName = cmdk_1.Command.Item.displayName;
