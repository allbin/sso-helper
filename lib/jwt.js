"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var jose = __importStar(require("jose"));
var JWT = function (raw_token) {
    var claims = jose.decodeJwt(raw_token);
    return {
        raw_token: raw_token,
        claims: claims,
        needsRenewal: function () {
            var now = Date.now() / 1000;
            var lifetime = claims.exp - claims.nbf;
            var left = lifetime - (now - claims.nbf);
            var percent = left / lifetime;
            return percent < 0.2;
        },
        isValid: function () {
            var now = Date.now() / 1000;
            return claims.exp > now && claims.nbf < now;
        },
        getRaw: function () { return raw_token; },
        getClaims: function () { return claims; },
        getClaim: function (name) { return claims[name]; },
    };
};
exports.default = JWT;
//# sourceMappingURL=jwt.js.map