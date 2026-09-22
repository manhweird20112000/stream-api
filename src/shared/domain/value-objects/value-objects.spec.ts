import { MoneyVO } from './money.vo';
import { PasswordVO } from './password.vo';

describe('value objects', () => {
  it('rejects non-finite money values and division by zero', () => {
    expect(() => new MoneyVO(Number.NaN)).toThrow();
    expect(() => new MoneyVO(Infinity)).toThrow();
    expect(() => new MoneyVO(1).divide(0)).toThrow();
  });

  it('rejects a password longer than 32 characters', () => {
    expect(() => PasswordVO.create('x'.repeat(33))).toThrow();
  });
});
