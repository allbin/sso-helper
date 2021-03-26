"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var JWT = function (raw_token) {
    var claims = jsonwebtoken_1.default.decode(raw_token);
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