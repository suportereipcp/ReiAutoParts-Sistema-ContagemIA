module.exports = {
  apps: [{
    name: 'contagem-edge',
    script: './src/server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '400M',
    env: { NODE_ENV: 'production' },
    error_file: './logs/pm2-err.log',
    out_file: './logs/pm2-out.log',
    time: true,
  }],
};
