# Tokens

The full design token pipeline is deferred to PUP-7.

`scaffold.ts` is a temporary shell-only bridge so route and feature shell code do not import raw token values directly. Do not extend it for product UI. PUP-7 must either delete it after generated native tokens exist or migrate its few values into the real token output with a drift check.
