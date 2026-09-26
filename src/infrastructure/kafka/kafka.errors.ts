export class KafkaGatewayTimeoutError extends Error {
  constructor() {
    super('Downstream service timed out');
    this.name = 'KafkaGatewayTimeoutError';
  }
}

export class KafkaGatewayDownstreamError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode = 502,
  ) {
    super(message);
    this.name = 'KafkaGatewayDownstreamError';
  }
}
