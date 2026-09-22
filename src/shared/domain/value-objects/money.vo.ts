export class MoneyVO {
  constructor(public readonly value: number) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Money must be finite and non-negative');
    }
  }

  subtract(other: MoneyVO): MoneyVO {
    return new MoneyVO(this.value - other.value);
  }

  add(other: MoneyVO): MoneyVO {
    return new MoneyVO(this.value + other.value);
  }

  multiply(other: number): MoneyVO {
    return new MoneyVO(this.value * other);
  }

  divide(other: number): MoneyVO {
    return new MoneyVO(this.value / other);
  }

  getValue(): number {
    return this.value;
  }

  format(): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(this.value);
  }
}
