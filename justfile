set shell := ["pwsh", "-c"]

default:
  @just --list

dev:
  @pnpm dev
