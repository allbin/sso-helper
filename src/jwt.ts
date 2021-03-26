import jwt from 'jsonwebtoken';

interface Claims {
  exp: number;
  nbf: number;
  [name: string]: string | number;
}

type ReadOnly<T> = {
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

const JWT = (raw_token: string): ReadOnly<JWT> => {
  const claims = jwt.decode(raw_token) as Claims;
  return {
    raw_token,
    claims,

    needsRenewal: () => {
      const now = Date.now() / 1000;
      const lifetime = claims.exp - claims.nbf;
      const left = lifetime - (now - claims.nbf);
      const percent = left / lifetime;

      return percent < 0.2;
    },

    isValid: () => {
      const now = Date.now() / 1000;
      return claims.exp > now && claims.nbf < now;
    },

    getRaw: () => raw_token,
    getClaims: () => claims,
    getClaim: (name: string) => claims[name],
  };
};

export default JWT;
