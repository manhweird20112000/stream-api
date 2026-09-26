export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');

export const STREAM_TOPICS = {
  commands: 'stream.commands',
  events: 'stream.events',
  commandReplies: 'stream.commands.reply',
} as const;

export const AUTH_TOPICS = {
  commands: 'auth.commands',
  events: 'auth.events',
  commandReplies: 'auth.commands.reply',
} as const;
