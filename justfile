set shell := ["pwsh", "-c"]

default:
  @just --list

dev:
  @pnpm dev
  
deploy:
  scp -r ./dist/ b2:/root/who-is-spy-fe
