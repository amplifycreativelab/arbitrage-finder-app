"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeVariants = void 0;
exports.Badge = Badge;
const jsx_runtime_1 = require("react/jsx-runtime");
const class_variance_authority_1 = require("class-variance-authority");
const utils_1 = require("../../lib/utils");
const badgeVariants = (0, class_variance_authority_1.cva)('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ot-accent focus:ring-offset-2', {
    variants: {
        variant: {
            default: 'border-transparent bg-ot-accent text-white',
            secondary: 'border-transparent bg-white/10 text-ot-foreground',
            outline: 'border-white/20 text-ot-foreground',
            accent: 'border-ot-accent bg-ot-accent/20 text-ot-accent'
        }
    },
    defaultVariants: {
        variant: 'default'
    }
});
exports.badgeVariants = badgeVariants;
function Badge({ className, variant, ...props }) {
    return (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)(badgeVariants({ variant }), className), ...props });
}
