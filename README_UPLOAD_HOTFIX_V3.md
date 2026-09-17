# PATROAI Frontend Native Auth Hotfix V3 - 2026-08-23

Este pacote corrige a falha restante do Railway em `npm test`.

## Causa do crash v3

O arquivo antigo `tests/oidc-and-terminal.test.mjs` continuou no GitHub após o upload manual. Como o pacote v2 pedia para deletar esse arquivo, mas o upload não removeu arquivos antigos, o Railway continuou executando testes OIDC legados.

## Correção desta versão

Esta v3 sobrescreve `tests/oidc-and-terminal.test.mjs` com um shim compatível com native auth:

```js
import "./native-auth-terminal.test.mjs";
```

Assim, mesmo que o arquivo antigo não seja apagado manualmente, o build deixa de exigir `/auth/callback`, `beginLogin` e token em `sessionStorage`.

## Aplicação

Envie todos os arquivos deste pacote mantendo os caminhos.

Ainda é recomendado remover depois os arquivos mortos:

```text
src/auth/oidc.ts
src/routes/AuthCallback.tsx
```

Mas esta versão não depende da remoção de `tests/oidc-and-terminal.test.mjs`.

## Validação local

- `node --test tests/*.test.mjs`: passou, 229/229.
- `tsc --noEmit`: passou anteriormente com o mesmo código fonte.
- `node --check server.mjs`: passou anteriormente com o mesmo servidor.
- `vite build`: passou anteriormente com o mesmo código fonte.
