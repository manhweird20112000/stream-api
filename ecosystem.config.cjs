module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: 1,
      watch: false,
      time: true,
      max_memory_restart: '512M',
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'development',
        TZ: 'Asia/Bangkok',
      },
      env_production: {
        NODE_ENV: 'production',
        TZ: 'Asia/Bangkok',
      },
    },
  ],
};
