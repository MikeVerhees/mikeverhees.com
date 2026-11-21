#!/bin/sh
# Installs Bun into the worker image; the dependency-update workflow runs `bun update --latest`.
# BUN_VERSION matches packageManager (bun@1.4.4) of the site repository being updated.
set -eu
BUN_VERSION="${BUN_VERSION:-1.4.4}"
case "$(uname -m)" in
  x86_64) arch="x64" ;;
  aarch64) arch="aarch64" ;;
  *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac
curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${arch}.zip" -o /tmp/bun.zip
unzip -q /tmp/bun.zip -d /tmp/bun
install -m 755 "/tmp/bun/bun-linux-${arch}/bun" /usr/local/bin/bun
rm -rf /tmp/bun /tmp/bun.zip
bun --version
