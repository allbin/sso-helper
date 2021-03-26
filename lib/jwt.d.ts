interface Claims {
    exp: number;
    nbf: number;
    [name: string]: string | number;
}
declare type ReadOnly<T> = {
    readonly [P in keyof T]: T[P];
};
interface JWT {
    raw_token: string;
    claims: Claims;
    needsRenewal: () => boolean;
    isValid: () => boolean;
    getRaw: () => string;
    getClaims: () => Record<string, any>;
    getClaim: (name: string) => any;
}
declare const JWT: (raw_token: string) => ReadOnly<JWT>;
export default JWT;
