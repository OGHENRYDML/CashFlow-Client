#!/usr/bin/env node
import('../dist/cli.js')
  .then((m) => m.main())
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exit(1);
  });
