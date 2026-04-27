# Knowledge examples

Sample files checked into the repo so a fresh Pectus install has something to digest. Safe to delete once you've added your own data to `knowledge/raw/`.

These files are read by `knowledge-digest` if you point it at this folder explicitly:

```
npx pectus knowledge digest --include-examples
```

By default the digest skill ignores `examples/` and only reads from `raw/`.
