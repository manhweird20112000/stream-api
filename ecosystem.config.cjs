module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: Number(process.env.API_GATEWAY_INSTANCES ?? 1),
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
