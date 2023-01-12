import axios from 'axios';
import base64url from 'base64-url';

import JWT from './jwt';
import { InvalidCredentialsError, InvalidTokenError } from './errors';

import type { AxiosError } from 'axios';

export interface SSOOptions {
  login_uri?: string;
  token_provider_uri?: string;
  renewal_check_interval?: number;
  jwt_acquire_callback?: (jwt: JWT) => void;
  jwt_renew_callback?: (jwt: JWT) => void;
  jwt_release_callback?: (was_logout?: boolean) => void;
}

interface SSOOptionsSettled {
  login_uri: string;
  token_provider_uri: string;
  renewal_check_interval: number;
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
  performPasswordReset: (
    username: string,
    password: string,
    code: string,
  ) => Promise<void>;
}

interface JWTContext {
  jwt: JWT | null;
  interval: NodeJS.Timeout | null;
}

interface TokenResponse {
  token: string;
}

const storage = typeof localStorage !== 'undefined' ? localStorage : null;

const SSO = (service: string, options: SSOOptions): SSO => {
  const defaults: SSOOptions = {
    login_uri: 'https://login.allbin.se',
    token_provider_uri: 'https://sso.allbin.se',
    renewal_check_interval: 30,
    jwt_acquire_callback: undefined,
    jwt_renew_callback: undefined,
    jwt_release_callback: undefined,
  };
  const data: JWTContext = {
    jwt: null,
    interval: null,
  };
  const opts = { ...defaults, ...options } as SSOOptionsSettled;

  const startRenewInterval = (): void => {
    clearRenewInterval();
    data.interval = setInterval(
      () => void checkRenew(),
      opts.renewal_check_interval * 1000,
    );
  };

  const clearRenewInterval = (): void => {
    if (data.interval) {
      clearInterval(data.interval);
      data.interval = null;
    }
  };

  const getJWT = (): JWT | null => {
    return data.jwt;
  };

  const setJWT = (jwt: JWT): void => {
    if (!jwt) {
      throw new Error('Attempted to set empty JWT');
    }
    data.jwt = jwt;

    if (storage) {
      storage.setItem(`${service}_jwt_token`, jwt.getRaw());
      storage.setItem(`last_jwt_token`, jwt.getRaw());
    }
    startRenewInterval();
  };

  const setJWTFromRaw = (raw_token: string): void => {
    setJWT(JWT(raw_token));
  };

  const clearLastJWT = (): void => {
    if (storage) {
      storage.removeItem(`last_jwt_token`);
    }
  };

  const clearJWT = (was_logout?: boolean): void => {
    if (data.jwt) {
      data.jwt = null;
      if (storage) {
        storage.removeItem(`${service}_jwt_token`);
      }
    }
    clearRenewInterval();
    opts.jwt_release_callback && opts.jwt_release_callback(was_logout);
  };

  const validateToken = (raw_token: string): void => {
    const jwt = JWT(raw_token);
    if (!jwt.isValid()) {
      throw new InvalidTokenError('Invalid token issued?');
    }

    if (jwt.getClaim('svc') !== service) {
      throw new InvalidTokenError('Token was not issued for this service');
    }

    if (!jwt.getClaim('login')) {
      throw new InvalidTokenError('No login claim in token');
    }
  };

  const getServiceSpecificToken = (): JWT | null =>
    getSavedJWT(`${service}_jwt_token`);

  const getLastToken = (): JWT | null => getSavedJWT(`last_jwt_token`);

  const init = async (): Promise<void> => {
    return await Promise.resolve().then(() => {
      const raw_token = decodeURIComponent(
        window.location.search.replace(
          new RegExp(
            '^(?:.*[&\\?]' +
              encodeURIComponent('token').replace(/[.+*]/g, '\\$&') +
              '(?:\\=([^&]*))?)?.*$',
            'i',
          ),
          '$1',
        ),
      );

      if (raw_token) {
        setJWTFromRaw(raw_token);
        opts.jwt_acquire_callback && opts.jwt_acquire_callback(data.jwt as JWT);
      }

      const svc_jwt = getServiceSpecificToken();
      if (svc_jwt) {
        setJWT(svc_jwt);
        return;
      }

      const last_jwt = getLastToken();
      if (last_jwt) {
        setJWT(last_jwt);
        return;
      }

      data.jwt = null;
    });
  };

  const renewToken = async (): Promise<string> =>
    await getTokenWithOtherToken((data.jwt as JWT).getRaw());

  const checkRenew = async (): Promise<void> => {
    if (!data.jwt) {
      return;
    }

    if (!data.jwt.isValid()) {
      clearJWT(false);
      return;
    }

    if (!data.jwt.needsRenewal()) {
      return;
    }

    try {
      const raw_token = await renewToken();
      setJWTFromRaw(raw_token);
      opts.jwt_renew_callback && opts.jwt_renew_callback(data.jwt);
    } catch (e) {
      const err = e as AxiosError;
      if (err.code && err.code !== 'ECONNABORTED') {
        // drop token if error was anything other than timeout
        clearJWT(false);
      }
    }
  };

  const getSavedJWT = (key: string): JWT | null => {
    if (storage) {
      const raw_token = storage.getItem(key);
      if (raw_token) {
        const jwt = JWT(raw_token);
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

  const loginWithCredentials = async (
    username: string,
    password: string,
  ): Promise<void> =>
    await axios
      .get<TokenResponse>(
        `${opts.token_provider_uri}/token?service=${service}`,
        {
          headers: {
            authorization: `Basic ${base64url.encode(
              [username, password].join(':'),
            )}`,
          },
          timeout: 10000,
        },
      )
      .then((r) => r.data.token)
      .then((raw_token) => {
        if (!raw_token) {
          throw new InvalidCredentialsError();
        }

        try {
          validateToken(raw_token);
        } catch (e) {
          clearJWT(false);
          throw e;
        }
        data.jwt = JWT(raw_token);
        opts.jwt_acquire_callback && opts.jwt_acquire_callback(data.jwt);
      });

  const getTokenWithOtherToken = async (raw_token: string): Promise<string> =>
    await axios
      .get<TokenResponse>(
        `${opts.token_provider_uri}/token?service=${
          (data.jwt as JWT).getClaim('svc') as string
        }`,
        {
          headers: {
            authorization: `Bearer ${raw_token}`,
          },
          timeout: 10000,
        },
      )
      .then((r) => r.data.token)
      .then((raw_token) => {
        if (!raw_token) {
          throw new InvalidCredentialsError();
        }

        try {
          validateToken(raw_token);
        } catch (e) {
          clearLastJWT();
          clearJWT(false);
          throw e;
        }

        return raw_token;
      });

  const loginWithToken = async (raw_token: string): Promise<void> =>
    await getTokenWithOtherToken(raw_token).then((new_raw_token) => {
      data.jwt = JWT(new_raw_token);
      opts.jwt_acquire_callback && opts.jwt_acquire_callback(data.jwt);
    });

  const logout = (): void => {
    clearLastJWT();
    clearJWT(true);
    document.location.href = `${opts.login_uri}/logout`;
  };

  const requestPasswordReset = async (username: string): Promise<void> =>
    await axios.post(`${opts.token_provider_uri}/reset/request`, { username });

  const performPasswordReset = async (
    username: string,
    password: string,
    code: string,
  ): Promise<void> =>
    await axios.post(`${opts.token_provider_uri}/reset/perform`, {
      username,
      password,
      code,
    });

  const isLoggedIn = (): boolean => {
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
    init,
    clearJWT,
    getJWT,
    setJWT,
    setJWTFromRaw,

    isLoggedIn,

    loginWithCredentials,
    loginWithToken,
    logout,

    requestPasswordReset,
    performPasswordReset,
  };
};

export default SSO;
