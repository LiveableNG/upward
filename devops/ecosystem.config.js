/**
 * PM2 ecosystem — start all Upward Node processes at once.
 *
 * From repo root on the server:
 *   pm2 start devops/ecosystem.config.js --env production
 *   pm2 save
 *
 * Restart later:
 *   pm2 restart all
 *   # or
 *   pm2 restart upward-api upward-web upward-pay upward-pm
 */
module.exports = {
  apps: [
    {
      name: 'upward-api',
      cwd: './server/apps/api',
      // Nest emits to dist/src/main.js on this server
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        // Allow large auth-cookie headers (must match nginx large_client_header_buffers)
        NODE_OPTIONS: '--max-http-header-size=32768',
      },
      error_file: '/var/log/upward/api-error.log',
      out_file: '/var/log/upward/api-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'upward-web',
      cwd: './client/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Allow large auth-cookie headers (must match nginx large_client_header_buffers)
        NODE_OPTIONS: '--max-http-header-size=32768',
      },
      error_file: '/var/log/upward/web-error.log',
      out_file: '/var/log/upward/web-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'upward-pay',
      cwd: './client/apps/upward-pay',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Allow large auth-cookie headers (must match nginx large_client_header_buffers)
        NODE_OPTIONS: '--max-http-header-size=32768',
      },
      error_file: '/var/log/upward/pay-error.log',
      out_file: '/var/log/upward/pay-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'upward-pm',
      cwd: './client/apps/upward-pm',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        // Allow large auth-cookie headers (must match nginx large_client_header_buffers)
        NODE_OPTIONS: '--max-http-header-size=32768',
      },
      error_file: '/var/log/upward/pm-error.log',
      out_file: '/var/log/upward/pm-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
