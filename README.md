# Nuvio Plugins

High-performance streaming providers/plugins for Nuvio.

## Installation

### For Development

```bash
git clone -b source https://github.com/dustincos/nuvio-plugins.git
cd nuvio-plugins
npm install
npm run build
```

### Adding a New Provider

1. Create a new folder in `src/<provider-name>/`
2. Add `index.js` and supporting modules
3. Run `npm run build` to compile lightweight binaries into `/providers`

## Using in Nuvio App

1. Open **Nuvio** > **Settings** > **Content & Discovery** > **Plugins**
2. Add repository URL: `https://raw.githubusercontent.com/dustincos/nuvio-plugins/refs/heads/source/manifest.json`
3. Refresh and enable the providers you wish to load.

## Credit

- Extraction patterns inspired by [CSX/CineStream](https://github.com/SaurabhKaperwan/CSX)
- Provider interface architecture adapted from [nuvio-providers](https://github.com/tapframe/nuvio-providers)

## License

GNU General Public License v3.0 - See [LICENSE](LICENSE) for details.