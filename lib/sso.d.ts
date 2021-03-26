import JWT from './jwt';
export interface SSOOptions {
    login_uri?: string;
    token_provider_uri?: string;
    renewal_check_interval?: number;
    jwt_acquire_callback?: (jwt: JWT) => void;
    jwt_renew_callback?: (jwt: JWT) => void;
    jwt_release_callback?: (was_logout?: boolean) => void;
}
export interface SSO {
    init: () => Promise<void>;
    clearJWT: (was_logout?: boolean) => void;
    getJWT: () => JWT | null;
    setJWT: (jwt: JWT) => void;
    setJWTFromRaw: (raw_token: string) => void;
    isLoggedIn: () => boolean;
    loginWithCredentials: (username: string, password: string) => Promise<void>;
    loginWithToken: (raw_token: string) => Promise<void>;
    logout: () => void;
    requestPasswordReset: (username: string) => Promise<void>;
    performPasswordReset: (username: string, password: string, code: string) => Promise<void>;
}
declare const SSO: (service: string, options: SSOOptions) => SSO;
export default SSO;
