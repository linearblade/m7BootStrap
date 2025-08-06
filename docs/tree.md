.
├── BootStrap.js               # Main controller (entry point for orchestration)
├── dom/                      
│   ├── DomRegistry.js         # DOM asset mounting logic
│   └── index.js               # Optional: exports or utilities for DOM
├── legacy/
│   ├── bootStrap.js
│   └── domManager.js
├── packages/
│   ├── PackageManager.js      # Handles packages, modules, assets
│   ├── AssetManager.js        # Handles loading and tracking non-module assets
│   ├── ModuleManager.js       # Handles loading JS modules
│   └── index.js               # Optional entrypoint for combined imports
├── repo/
│   └── Repo.js                # Package resolution logic
├── docs/
│   ├── packageDefinition.md   # Design of package files
│   └── flow.md                # Bootstrapping or execution flow
├── todo.md