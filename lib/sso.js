"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var base64_url_1 = __importDefault(require("base64-url"));
var jwt_1 = __importDefault(require("./jwt"));
var errors_1 = require("./errors");
var storage = typeof localStorage !== 'undefined' ? localStorage : null;
var SSO = function (service, options) {
    var defaults = {
        login_uri: 'https://login.allbin.se',
        token_provider_uri: 'https://sso.allbin.se',
        renewal_check_interval: 30,
        jwt_acquire_callback: undefined,
        jwt_renew_callback: undefined,
        jwt_release_callback: undefined,
    };
    var data = {
        jwt: null,
        interval: null,
    };
    var opts = __assign(__assign({}, defaults), options);
    var startRenewInterval = function () {
        clearRenewInterval();
        data.interval = setInterval(function () { return void checkRenew(); }, opts.renewal_check_interval * 1000);
    };
    var clearRenewInterval = function () {
        if (data.interval) {
            clearInterval(data.interval);
            data.interval = null;
        }
    };
    var getJWT = function () {
        return data.jwt;
    };
    var setJWT = function (jwt) {
        if (!jwt) {
            throw new Error('Attempted to set empty JWT');
        }
        data.jwt = jwt;
        if (storage) {
            storage.setItem(service + "_jwt_token", jwt.getRaw());
            storage.setItem("last_jwt_token", jwt.getRaw());
        }
        startRenewInterval();
    };
    var setJWTFromRaw = function (raw_token) {
        setJWT(jwt_1.default(raw_token));
    };
    var clearLastJWT = function () {
        if (storage) {
            storage.removeItem("last_jwt_token");
        }
    };
    var clearJWT = function (was_logout) {
        if (data.jwt) {
            data.jwt = null;
            if (storage) {
                storage.removeItem(service + "_jwt_token");
            }
        }
        clearRenewInterval();
        opts.jwt_release_callback && opts.jwt_release_callback(was_logout);
    };
    var validateToken = function (raw_token) {
        var jwt = jwt_1.default(raw_token);
        if (!jwt.isValid()) {
            throw new errors_1.InvalidTokenError('Invalid token issued?');
        }
        if (jwt.getClaim('svc') !== service) {
            throw new errors_1.InvalidTokenError('Token was not issued for this service');
        }
        if (!jwt.getClaim('login')) {
            throw new errors_1.InvalidTokenError('No login claim in token');
        }
    };
    var getServiceSpecificToken = function () {
        return getSavedJWT(service + "_jwt_token");
    };
    var getLastToken = function () { return getSavedJWT("last_jwt_token"); };
    var init = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () {
                        var raw_token = decodeURIComponent(window.location.search.replace(new RegExp('^(?:.*[&\\?]' +
                            encodeURIComponent('token').replace(/[.+*]/g, '\\$&') +
                            '(?:\\=([^&]*))?)?.*$', 'i'), '$1'));
                        if (raw_token) {
                            setJWTFromRaw(raw_token);
                            opts.jwt_acquire_callback && opts.jwt_acquire_callback(data.jwt);
                        }
                        var svc_jwt = getServiceSpecificToken();
                        if (svc_jwt) {
                            setJWT(svc_jwt);
                            return;
                        }
                        var last_jwt = getLastToken();
                        if (last_jwt) {
                            setJWT(last_jwt);
                            return;
                        }
                        data.jwt = null;
                    })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    var renewToken = function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getTokenWithOtherToken(data.jwt.getRaw())];
            case 1: return [2 /*return*/, _a.sent()];
        }
    }); }); };
    var checkRenew = function () { return __awaiter(void 0, void 0, void 0, function () {
        var raw_token, e_1, err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!data.jwt) {
                        return [2 /*return*/];
                    }
                    if (!data.jwt.isValid()) {
                        clearJWT(false);
                        return [2 /*return*/];
                    }
                    if (!data.jwt.needsRenewal()) {
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, renewToken()];
                case 2:
                    raw_token = _a.sent();
                    data.jwt = jwt_1.default(raw_token);
                    opts.jwt_renew_callback && opts.jwt_renew_callback(data.jwt);
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    err = e_1;
                    if (err.code && err.code !== 'ECONNABORTED') {
                        // drop token if error was anything other than timeout
                        clearJWT(false);
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var getSavedJWT = function (key) {
        if (storage) {
            var raw_token = storage.getItem(key);
            if (raw_token) {
                var jwt = jwt_1.default(raw_token);
                if (jwt.isValid() && jwt.getClaim('svc') === service) {
                    return jwt;
                }
                if (storage) {
                    storage.removeItem(key);
                }
            }
        }
        return null;
    };
    var loginWithCredentials = function (username, password) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default
                        .get(opts.token_provider_uri + "/token?service=" + service, {
                        headers: {
                            authorization: "Basic " + base64_url_1.default.encode([username, password].join(':')),
                        },
                        timeout: 10000,
                    })
                        .then(function (r) { return r.data.token; })
                        .then(function (raw_token) {
                        if (!raw_token) {
                            throw new errors_1.InvalidCredentialsError();
                        }
                        try {
                            validateToken(raw_token);
                        }
                        catch (e) {
                            clearJWT(false);
                            throw e;
                        }
                        data.jwt = jwt_1.default(raw_token);
                        opts.jwt_acquire_callback && opts.jwt_acquire_callback(data.jwt);
                    })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    var getTokenWithOtherToken = function (raw_token) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default
                        .get(opts.token_provider_uri + "/token?service=" + data.jwt.getClaim('svc'), {
                        headers: {
                            authorization: "Bearer " + raw_token,
                        },
                        timeout: 10000,
                    })
                        .then(function (r) { return r.data.token; })
                        .then(function (raw_token) {
                        if (!raw_token) {
                            throw new errors_1.InvalidCredentialsError();
                        }
                        try {
                            validateToken(raw_token);
                        }
                        catch (e) {
                            clearLastJWT();
                            clearJWT(false);
                            throw e;
                        }
                        return raw_token;
                    })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    var loginWithToken = function (raw_token) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getTokenWithOtherToken(raw_token).then(function (new_raw_token) {
                        data.jwt = jwt_1.default(new_raw_token);
                        opts.jwt_acquire_callback && opts.jwt_acquire_callback(data.jwt);
                    })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    var logout = function () {
        clearLastJWT();
        clearJWT(true);
        document.location.href = opts.login_uri + "/logout";
    };
    var requestPasswordReset = function (username) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, axios_1.default.post(opts.token_provider_uri + "/reset/request", { username: username })];
            case 1: return [2 /*return*/, _a.sent()];
        }
    }); }); };
    var performPasswordReset = function (username, password, code) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default.post(opts.token_provider_uri + "/reset/perform", {
                        username: username,
                        password: password,
                        code: code,
                    })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
    var isLoggedIn = function () {
        if (!data.jwt) {
            return false;
        }
        if (!data.jwt.isValid()) {
            clearJWT(false);
            return false;
        }
        return data.jwt.getClaim('svc') === service && !!data.jwt.getClaim('login');
    };
    return {
        init: init,
        clearJWT: clearJWT,
        getJWT: getJWT,
        setJWT: setJWT,
        setJWTFromRaw: setJWTFromRaw,
        isLoggedIn: isLoggedIn,
        loginWithCredentials: loginWithCredentials,
        loginWithToken: loginWithToken,
        logout: logout,
        requestPasswordReset: requestPasswordReset,
        performPasswordReset: performPasswordReset,
    };
};
exports.default = SSO;
//# sourceMappingURL=sso.js.map