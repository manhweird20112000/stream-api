export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');

export const STREAM_TOPICS = {
  commands: 'stream.commands',
  events: 'stream.events',
  commandReplies: 'stream.commands.reply',
} as const;
