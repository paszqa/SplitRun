# Speedrun Splitter (Tauri v2 skeleton)

A minimal Tauri app that opens a window and shows a live timer since app load.

## Run (dev)

- Linux prerequisites (Ubuntu/Debian example):
  - libwebkit2gtk-4.1-dev, libsoup-3.0-dev, libgtk-3-dev, libayatana-appindicator3-dev, librsvg2-dev
  - build-essential, pkg-config, curl, wget, file, patchelf
- Rust toolchain: `rustup` with stable
- Tauri CLI: `cargo install tauri-cli`

Then from the project root:

```
cargo tauri dev
```

This compiles and opens the app window. The timer should increment immediately.

## Build (release installers)

```
cargo tauri build
```

Bundles are created under `src-tauri/target/release/bundle/`.

## Project structure

- `dist/` – static frontend (HTML/CSS/JS with the timer)
- `src-tauri/` – Tauri (Rust) project and configuration

## Windows notes

- Requires the Microsoft Edge WebView2 Runtime and the MSVC build toolchain (Visual Studio Build Tools).
- Run and build with the same commands above in a Developer PowerShell/Prompt.

## Next steps

- Add global hotkeys (Tauri plugin) for start/split/reset, with Wayland-aware fallbacks.
- Persist configurable hotkeys and basic settings.