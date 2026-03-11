# devops

Infrastructure-as-code and CI/CD configuration for the Upward platform.

## Contents (to be added per sprint)

```
devops/
├── docker/
│   ├── Dockerfile.backend      ← Multi-stage Docker build for NestJS API
│   └── docker-compose.yml      ← Local dev stack (Postgres + Redis)
├── nginx/
│   └── nginx.conf              ← Reverse proxy config for EC2
├── ec2/
│   └── setup.sh                ← EC2 bootstrap script (Docker, PM2, env)
└── .github/
    └── workflows/
        ├── frontend.yml        ← Vercel deploy via GitHub Actions
        └── backend.yml         ← Docker build + SSH deploy to EC2
```

Files will be created when deployment configuration begins.
