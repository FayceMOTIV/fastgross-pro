module.exports = {
  apps: [{
    name: 'fmf-scraper',
    script: '/root/fmf-venv/bin/gunicorn',
    args: '-w 1 --timeout=300 app:app -b 0.0.0.0:3001',
    cwd: '/root/fmf-scraper',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      PYTHONPATH: '/root/fmf-scraper',
    },
  }],
};
