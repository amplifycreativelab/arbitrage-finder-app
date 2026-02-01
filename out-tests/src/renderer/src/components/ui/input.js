"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = Input;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
function Input({ className, type = 'text', ...props }) {
    return ((0, jsx_runtime_1.jsx)("input", { className: (0, utils_1.cn)('ot-input', className), type: type, ...props }));
}
exports.default = Input;
