module.exports = {
  apps: [
    {
      name: "gitlab-duo-proxy",
      script: "npx",
      args: "tsx src/server.ts",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      restart_delay: 3000,
      // Logging
      error_file: ".proxy-error.log",
      out_file: ".proxy-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Watch (disabled by default, enable for dev)
      watch: false,
      ignore_watch: ["node_modules", "dist", ".git", "*.log"],
    },
  ],
};
