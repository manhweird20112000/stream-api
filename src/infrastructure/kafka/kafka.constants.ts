export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');

export const STREAM_TOPICS = {
  commands: 'stream.commands',
  events: 'stream.events',
  replies: 'stream.replies',
} as const;
