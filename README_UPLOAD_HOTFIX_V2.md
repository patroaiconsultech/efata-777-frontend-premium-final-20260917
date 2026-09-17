# PATROAI Frontend Native Auth Hotfix V2 - 2026-08-23

Este pacote corrige a falha de build do Railway em `npm test` após a migração para autenticação nativa.

## Causa do crash

O deploy não chegou ao runtime. O build falhou em:

```text
RUN npm test
```

Os testes ainda esperavam o contrato antigo OIDC/Zitadel (`VITE_OIDC_*`, `/auth/callback`, `src/auth/oidc.ts`, token em `sessionStorage`).

## Como aplicar no GitHub

1. Envie os arquivos deste pacote mantendo exatamente os caminhos.
2. Remova os arquivos listados em `DELETE_FILES.txt`.
3. Faça novo deploy no Railway.

## Variáveis de produção do frontend

Manter:

```text
VITE_API_BASE_URL=https://plataforma-efata-777-backend-production.up.railway.app
VITE_STREAM_TIMEOUT_MS=300000
ORKIO_CSP_CONNECT_SRC=https://plataforma-efata-777-backend-production.up.railway.app
```

Remover qualquer `VITE_OIDC_*` e qualquer referência a:

```text
orkio-efata777-gtaskz.us1.zitadel.cloud
```

## Validação local

- `node --test tests/*.test.mjs`: passou, 216/216.
- `tsc --noEmit`: passou.
- `node --check server.mjs`: passou.
- `vite build`: passou.
- Bundle final sem `OIDC`, `auth/callback`, `VITE_OIDC`, `beginLogin`, `completeLogin`, `provedor de identidade` ou `Authorization.*Bearer`.

## Resultado esperado

- Railway não deve mais falhar em `npm test`.
- `/access` deve abrir o portal nativo PatroAI.
- A landing deve enviar acesso privado para `/access`.
- `/env.js` deve expor apenas `VITE_API_BASE_URL` e `VITE_STREAM_TIMEOUT_MS`.
