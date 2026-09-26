export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');

export const STREAM_TOPICS = {
  commands: 'stream.commands',
  events: 'stream.events',
  commandReplies: 'stream.commands.reply',
} as const;

export const AUTH_TOPICS = {
  register: 'auth.register',
  verifyEmail: 'auth.verify_email',
  login: 'auth.login',
  refresh: 'auth.refresh',
  logout: 'auth.logout',
  me: 'auth.me',
  updateMe: 'auth.update_me',
  googleStart: 'auth.google_start',
  googleCallback: 'auth.google_callback',
  events: 'auth.events',
} as const;
