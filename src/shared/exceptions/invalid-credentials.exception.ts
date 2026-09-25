import { UnauthorizedException } from '@nestjs/common';

/**
 * Thrown when login fails due to invalid email or password.
 * Use same message for both cases to prevent user enumeration.
 */
export class InvalidCredentialsException extends UnauthorizedException {
  constructor(message = 'Invalid credentials') {
    super(message);
    this.name = 'InvalidCredentialsException';
    Object.setPrototypeOf(this, InvalidCredentialsException.prototype);
  }
}
