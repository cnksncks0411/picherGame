# WIE

[Homepage](https://wie-site.dlunch.net) | [Try in browser](https://wie.dlunch.net)

A standalone emulator for old mobile apps based on WIPI, SKVM or J2ME.

This project is dedicated to digital preservation and educational research. Our goal is to revive the legacy of classic mobile games and allow them to be experienced in modern environments.

- [배포 가이드](DEPLOY.md)
- [Contribution guide](https://github.com/dlunch/wie/blob/main/CONTRIBUTING.md)
- Architecture docs: [Emulator](docs/architecture.md) | [KTF](docs/ktf.md) | [LGT](docs/lgt.md)

## Frontend

The web and Android/iOS frontends are maintained in this repository under `wie-web` and `wie-app`.
The web frontend is React + Vite; the emulator core is compiled to wasm by `wasm-pack`, which
Vite invokes automatically.

Requires the Rust toolchain with the `wasm32-unknown-unknown` target, plus `wasm-pack`.

```bash
npm install
npm start           # web development server (serves the optimized emulator)
npm run play        # optimized build served as static files

# Working on the Rust emulator itself? Trade emulator speed for fast rebuilds:
#   WIE_WASM_DEV=1 npm start
npm run build:dev   # development web build
npm run build:prod  # production web build
npm run typecheck   # TypeScript check
```

## Related projects

- [RustJava](https://github.com/dlunch/RustJava)
- [smaf](https://github.com/dlunch/smaf)
