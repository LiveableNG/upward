module.exports = {
  apps: [
    {
      name: 'upward-api',
      script: './server/apps/api/dist/main.js',
      instances: 'max', // or 1, 2, etc., depending on instance size
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        // Add other production environment variables here if needed
        // e.g. PORT: 3000
      },
      // You can specify the working directory, usually it will be the root of the repo
      cwd: './', 
    },
  ],
};
