module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: 'max',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
