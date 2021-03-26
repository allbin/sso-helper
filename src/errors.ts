export class InvalidCredentialsError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
export class InvalidTokenError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidTokenError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
