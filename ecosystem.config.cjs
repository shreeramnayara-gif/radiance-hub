// PM2 process manifest for running the Aspire frontend on a Node VPS.
//
// Usage:
//   npm install -g pm2
//   bun install && bun run build
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save && pm2 startup
//
// Logs:    pm2 logs aspire-frontend
// Reload:  pm2 reload aspire-frontend
module.exports = {
  apps: [
    {
      name: "aspire-frontend",
      script: ".output/server/index.mjs",
      exec_mode: "cluster",
      instances: "max", // one worker per CPU core; set a number to pin
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },
      max_memory_restart: "512M",
      out_file: "./logs/out.log",
      error_file: "./logs/err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
