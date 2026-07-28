# NuclearUSB Installers

Installers are stored manually on the USB drive so NuclearUSB can be repaired or prepared on a new Windows PC without internet access. Installer binaries are not meant to be committed to Git.

| Installer | Version | URL | Where to place | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| Node.js LTS for Windows x64 | Node.js 18+ LTS recommended | https://nodejs.org/en/download | `downloads/installers/node/` | Required if Node.js is not already installed | Official Windows x64 installers are distributed as `.msi` files. The launcher can point the user here if Node is missing. |

Keep only small text instructions in Git. Place `.msi` and `.exe` installers on the USB manually.
