# qUIck ZIP inbox

Export `*-ui-export.zip` files from the bundled qUIck Figma plugin directly into this folder.

Import every ZIP currently in the inbox with:

```bash
npm run import:quick-ui
```

The command validates archive paths, document JSON, and referenced PNGs; installs the files under `public/generated-ui`; rebuilds the generated UI atlas; and deletes the ZIPs only after the complete import succeeds.

Do not manually extract qUIck ZIPs. Keep only the exports you intend to import in this folder.
