# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.6.1](https://github.com/hiddentao/clockwork-engine/compare/v1.6.0...v1.6.1) (2025-09-21)


### Code Refactoring

* rename PRNG initialize() method to reset() ([58b7672](https://github.com/hiddentao/clockwork-engine/commit/58b7672e7be4906adfbad84b28cec3ffbf6f80d7))

## [1.6.0](https://github.com/hiddentao/clockwork-engine/compare/v1.5.0...v1.6.0) (2025-09-21)


### Features

* **demo:** update UI to display ticks and real FPS ([c8db781](https://github.com/hiddentao/clockwork-engine/commit/c8db781355e32d636cc4ee48fc42cc11f0fc4836))
* implement frames-to-ticks conversion in GameCanvas and demo ([d4c2761](https://github.com/hiddentao/clockwork-engine/commit/d4c2761341c16da0db7cc96852abaef46d814df4))


### Bug Fixes

* improve stability of performance test with warmup and median timing ([ac4c9e0](https://github.com/hiddentao/clockwork-engine/commit/ac4c9e0238105a225d27d3806e42df18c6461ae6))
* **tests:** update GameCanvas test to use deltaTicks parameter ([d6b7407](https://github.com/hiddentao/clockwork-engine/commit/d6b7407b85cec11aa678268e81147d3bb01feccb))
* update GameCanvas to use tick-based timing and format package.json ([b891e65](https://github.com/hiddentao/clockwork-engine/commit/b891e650488f094533adf6158afab559b922bd34))

## [1.5.0](https://github.com/hiddentao/clockwork-engine/compare/v1.4.0...v1.5.0) (2025-09-21)


### Bug Fixes

* **demo:** update remaining frame references to tick methods ([de18108](https://github.com/hiddentao/clockwork-engine/commit/de18108a9061f1d7b1feb38e59ac3039e37ba4e0))
* lint issues ([de19a18](https://github.com/hiddentao/clockwork-engine/commit/de19a1815d30c6a2cd731e8b3da6f879271534c9))


### Code Refactoring

* migrate from frame-based to tick-based timing system ([57da91d](https://github.com/hiddentao/clockwork-engine/commit/57da91d0fec82cf96a9b30855a6832b6f9864439))
* **replay:** update ReplayManager architecture to use proxy pattern ([85398f0](https://github.com/hiddentao/clockwork-engine/commit/85398f0763f112eb3c4a20b60eddcb7961270a82))

## [1.4.0](https://github.com/hiddentao/clockwork-engine/compare/v1.3.0...v1.4.0) (2025-09-18)


### Features

* **collision:** prevent duplicate points in CollisionBspTree ([84a515b](https://github.com/hiddentao/clockwork-engine/commit/84a515b7b8cca4054e97f6c8a6be61ee02b28a6f))
* **core:** add clearAndDestroy method to GameObjectGroup ([480ed18](https://github.com/hiddentao/clockwork-engine/commit/480ed18a42cfd62c5f3f53d58122f825869838cb))
* **lib:** add performance timing utilities with comprehensive test coverage ([fdae4f0](https://github.com/hiddentao/clockwork-engine/commit/fdae4f034194aba0d0697945589ba42364d0d4f9))
* **loader:** add Loader abstraction with DemoLoader implementation and comprehensive tests ([8bafa06](https://github.com/hiddentao/clockwork-engine/commit/8bafa06f4541ac376395c376186c9f8f2f558271))
* **prng:** add threshold parameter to randomBoolean() method ([372bbc1](https://github.com/hiddentao/clockwork-engine/commit/372bbc171212bf568dc3c8d0795ed8728ed52b7b))
* **rendering:** add automatic PIXI Graphics cleanup with comprehensive testing ([a6387b6](https://github.com/hiddentao/clockwork-engine/commit/a6387b6cbd9a79033b93d31b71c355fd9adcb76d))
* **rendering:** add needsRepaint flag optimization system ([b5466c2](https://github.com/hiddentao/clockwork-engine/commit/b5466c252ccac29a7915eb876fef9eaea8851f39))


### Bug Fixes

* **ci:** improve workflow order and separate demo linting ([85df80c](https://github.com/hiddentao/clockwork-engine/commit/85df80c12057927d0ac3adbbdc903df8727ea943))
* **ci:** move linting before build and add demo linting to pre-commit hooks ([0e9e6a2](https://github.com/hiddentao/clockwork-engine/commit/0e9e6a2cf71b5183e1ac672aa30959072313cd58))
* **tests:** implement comprehensive PIXI mocking and fix rendering tests ([4877701](https://github.com/hiddentao/clockwork-engine/commit/4877701dd161bc9f30522110141bd48cdac4b346))


### Code Refactoring

* move GameCanvas from rendering to root and add comprehensive lib utilities ([fc6306f](https://github.com/hiddentao/clockwork-engine/commit/fc6306fb6aba4bf7549cd0238532c14d92b21ce8))
* **rendering:** rename destroy() to clear() in AbstractRenderer ([007dd78](https://github.com/hiddentao/clockwork-engine/commit/007dd782930a48ad8977b1d57869241adce3be0f))
* replace CollisionBspTree with simplified CollisionGrid ([36aa34b](https://github.com/hiddentao/clockwork-engine/commit/36aa34b28e716c913de980e5bb645cc315abc88a))

## [1.3.0](https://github.com/hiddentao/clockwork-engine/compare/v1.2.0...v1.3.0) (2025-09-12)


### Features

* add comprehensive PIXI.js rendering system ([b7da431](https://github.com/hiddentao/clockwork-engine/commit/b7da431077eff2ef2f3eb07eeed5800ff2262b5d))
* add GameObjectEventType enum for type-safe event handling ([3234943](https://github.com/hiddentao/clockwork-engine/commit/32349434057c551947cc0f4ca7f311a6172e0c47))
* add totalFrames parameter to GameObject.update() method ([2cae386](https://github.com/hiddentao/clockwork-engine/commit/2cae386e8286ac2c3f241f41c95b0dd82ec59ab3))
* improve GameObjectGroup event emission system ([6d80bd0](https://github.com/hiddentao/clockwork-engine/commit/6d80bd0e2fe53e152ae3b15d53b86739c2f5d3ae))


### Bug Fixes

* **ci:** separate main and demo linting to resolve TypeScript resolution issues ([83c535b](https://github.com/hiddentao/clockwork-engine/commit/83c535bfb27fb8c7684f373fd4cd80f50532061d))
* correct formatting and broken links in documentation ([b0017f3](https://github.com/hiddentao/clockwork-engine/commit/b0017f313a82b20a63a9a89ae4c28c0ec41db48f))
* prevent GameObject update when destroyed ([8812c7b](https://github.com/hiddentao/clockwork-engine/commit/8812c7bba4ad19169d450dfd07c3e8f8bb2d387a))


### Documentation

* fix markdown links in README.md ([fcddc78](https://github.com/hiddentao/clockwork-engine/commit/fcddc78c78df536f8c85d3801e1636992f1cfab2))


### Tests

* expand test coverage and improve code quality ([83a57aa](https://github.com/hiddentao/clockwork-engine/commit/83a57aa2cd1c4d45c9e7558a1dc5785d0639bfce))


### Code Refactoring

* rename getAll() to getAllActive() in GameObjectGroup ([b6531b8](https://github.com/hiddentao/clockwork-engine/commit/b6531b88df415c8aea6e4bee8a1f69477e0a865a))


### Performance Improvements

* optimize CollisionUtils rebuildTree by merging index and bounds calculation ([ecc7e75](https://github.com/hiddentao/clockwork-engine/commit/ecc7e75f2dc2c11f9d506706580146be2456e446))

## 1.2.0 (2025-09-09)


### Features

* add automated release system with commit-and-tag-version ([46bc9d4](https://github.com/hiddentao/clockwork-engine/commit/46bc9d4ae4d01901cb2ac2b964930f00de9903bc))
* add singleton Serializer instance export ([acccdef](https://github.com/hiddentao/clockwork-engine/commit/acccdefc5a5889599f0a52e3084ff1a0c94518cc))
* enhance game engine with improved recording/replay system and UI controls ([09526ee](https://github.com/hiddentao/clockwork-engine/commit/09526ee61ecb951631c829e79fbb44b80550b6f2))
* enhance snake controls and remove start button ([6ad9522](https://github.com/hiddentao/clockwork-engine/commit/6ad9522815dee99ef58fdf3398954d02292e357f))
* implement CollisionBspTree-based spatial collision detection ([76ac206](https://github.com/hiddentao/clockwork-engine/commit/76ac20615692a6cdc8a86f4c34741bed629fb614))
* implement event-driven recording system with enum-based event handling ([b7785fe](https://github.com/hiddentao/clockwork-engine/commit/b7785fe18ec03ba946198985233f5986b638cc73))
* implement frame-perfect replay with enhanced UI state management ([d245315](https://github.com/hiddentao/clockwork-engine/commit/d24531500a22d443f96fd74f31bca48f78f76781))
* improve determinism and add snake wrap-around gameplay ([d698541](https://github.com/hiddentao/clockwork-engine/commit/d6985415e781bf33fc6fa64ba45d354ada8c1aa9))


### Bug Fixes

* build and publish ([d1874af](https://github.com/hiddentao/clockwork-engine/commit/d1874af170c072a729644477aac8334b15dcde1c))
* build coverage generation and reporting ([c771e35](https://github.com/hiddentao/clockwork-engine/commit/c771e3555a9270faba86b77bf9707edc09b12ae5))
* configure Vite for relative paths in GitHub Pages deployment ([6ec3f1f](https://github.com/hiddentao/clockwork-engine/commit/6ec3f1f192f07dfffac3100dda662bb67817317e))
* improve replay determinism by splitting large deltaFrames ([c8e7e70](https://github.com/hiddentao/clockwork-engine/commit/c8e7e70cec7916865dfd6bdcc6158cc232d846c5))
* npm package license ([c1a86f2](https://github.com/hiddentao/clockwork-engine/commit/c1a86f2db34b137e84018e591db3f42b6d57bfcb))
* performance recording test not recording frame data ([f26d1c0](https://github.com/hiddentao/clockwork-engine/commit/f26d1c0066d6e254f534346548db2c87f1f2f993))
* prevent double apple spawning in same frame ([df8c147](https://github.com/hiddentao/clockwork-engine/commit/df8c14746077d41bdb5b0559bdcf1b151662cc44))
* readme build badge ([082f760](https://github.com/hiddentao/clockwork-engine/commit/082f7608042ea2b4f99121610a9a8039e2162814))
* resolve all TypeScript errors in test files and enhance type safety ([47b10b0](https://github.com/hiddentao/clockwork-engine/commit/47b10b0c250646838bf3c2be4b2c3389465494b3))
* resolve concurrent timer modifications in Timer class ([6078702](https://github.com/hiddentao/clockwork-engine/commit/607870259ffcfa4163946318d518b830fafbefc7))
* resolve PRNG desynchronization in record-replay tests ([802fee3](https://github.com/hiddentao/clockwork-engine/commit/802fee3cffdba2bc22cc59aac56a90406039794b))
* resolve record-replay test failures and improve determinism ([8016a5b](https://github.com/hiddentao/clockwork-engine/commit/8016a5b21f40688ab1031fba8c94147bbdd709ea))
* resolve ReplayManager and integration test failures ([14e057d](https://github.com/hiddentao/clockwork-engine/commit/14e057d4345c056593e881cf9a73a7cd47950ce2))
* serialization performance test expecting wrong type ([c0d252d](https://github.com/hiddentao/clockwork-engine/commit/c0d252db125c36091b80771f8c5d88620280b736))
* stress test looking for wrong game object group name ([2939e90](https://github.com/hiddentao/clockwork-engine/commit/2939e90fb049ea7d27dd710dfba256066c7708f6))


### Documentation

* add comprehensive documentation suite with live demo integration ([0a162cd](https://github.com/hiddentao/clockwork-engine/commit/0a162cdeb44b70766e8aeacf081ae1a9e25e1447))
* add coveralls badge and configure npm package files ([da95533](https://github.com/hiddentao/clockwork-engine/commit/da955336daee5c9ea35b9404e81c3b1ece8e0b16))
* update deltaTime parameter to deltaFrames ([df6148d](https://github.com/hiddentao/clockwork-engine/commit/df6148ded261fb9e2924b703b6a439bbe52fbf6a))
* update readme ([56c4036](https://github.com/hiddentao/clockwork-engine/commit/56c4036a299e77863bdc8c9a420b9e18dc984d93))


### Tests

* improve code coverage to 100% for core modules ([7de9f61](https://github.com/hiddentao/clockwork-engine/commit/7de9f615ecc0a7e647a261db66a1083de77fc7b8))
* restructure test suite with comprehensive coverage ([9af1094](https://github.com/hiddentao/clockwork-engine/commit/9af1094492860dbc180fa218bbd1d2874a18c326))


### Build System

* add logging for tar ([b5aa17e](https://github.com/hiddentao/clockwork-engine/commit/b5aa17e2c01ac8df15fe342e2aa741c64e8bed4d))
* build on prepublish ([d1c52b1](https://github.com/hiddentao/clockwork-engine/commit/d1c52b1e91aadace85cf5d63f5e9d420a6b477c1))
* bump version ([8c6bc0f](https://github.com/hiddentao/clockwork-engine/commit/8c6bc0fdb285f94cef369e50c0172a3b3ed3fa1a))
* dont zip the tar ([87b5a3c](https://github.com/hiddentao/clockwork-engine/commit/87b5a3c028a3e2cde508377a8b472d6b73a4a24d))
* fix git config issues for gh-pages ([c690157](https://github.com/hiddentao/clockwork-engine/commit/c6901570adf55a596bdad455b40ce0b6dec90d1c))
* fix removal of tsconfig.buildinfo ([7b80abd](https://github.com/hiddentao/clockwork-engine/commit/7b80abdbb943bd1aa1b8594c4c0bdebaab24b1cc))
* recursive tar ([2003690](https://github.com/hiddentao/clockwork-engine/commit/2003690dee0af17ab601e404c6675f9c0dbd6e09))
* switch to artifacts uploader for gh-pages ([8c2cf3b](https://github.com/hiddentao/clockwork-engine/commit/8c2cf3b79af6ea35f70b0fd38de4d44a0c6d0e9b))
* try again ([1a730f1](https://github.com/hiddentao/clockwork-engine/commit/1a730f1715de10e2ceb51b216d4a83c876053f49))
* try and fix gh-pages action usage ([fc16127](https://github.com/hiddentao/clockwork-engine/commit/fc16127b4a18c184d1a48bf017d4b4ac6b41f2e5))
* try to fix github pages asset upload ([19d57aa](https://github.com/hiddentao/clockwork-engine/commit/19d57aafca54d86d9b65cfacef0b7fda38955d0f))


### CI/CD

* add GitHub workflows for CI and demo deployment ([aef070c](https://github.com/hiddentao/clockwork-engine/commit/aef070c8b005f6252f11b0138aa19bb79fd52ee2))
* switch deploy workflow to use gh-pages npm package ([6ffe14d](https://github.com/hiddentao/clockwork-engine/commit/6ffe14def2dfe1a7cb98082901089a50f628da09))


### Code Refactoring

* improve engine robustness and documentation ([25c0fe6](https://github.com/hiddentao/clockwork-engine/commit/25c0fe6364ead8c336a55cc3e24d60a5978a3904))
* move collision checking to update loop and clean up unused methods ([d8bb619](https://github.com/hiddentao/clockwork-engine/commit/d8bb6190820eefffe581148151904fb7cc31c8d0))
* move fractional frame logic to GameEngine for replay determinism ([1379db2](https://github.com/hiddentao/clockwork-engine/commit/1379db27e165e92dd17572e8621031a7ff9fd648))
* rename package to @hiddentao/clockwork-engine ([a08d26b](https://github.com/hiddentao/clockwork-engine/commit/a08d26bc344a2d03439a0e3d89f26cb4b6af5b1d))
* simplify game engine methods and improve PRNG tests ([1cdeee1](https://github.com/hiddentao/clockwork-engine/commit/1cdeee1e993238da5b4058b164302608e6d89cbe))
* simplify walls to single blocks ([63f2862](https://github.com/hiddentao/clockwork-engine/commit/63f2862872fbe410b46f9d6d412ffc66159cff7b))
* update demo build instructions ([d3e9301](https://github.com/hiddentao/clockwork-engine/commit/d3e9301d9394abda2a01b0d421ff11be581f8d0a))

## [1.1.1] - 2024-09-09

### Features
- Add singleton Serializer instance export

### Bug Fixes
- Prevent double apple spawning in same frame
- Configure Vite for relative paths in GitHub Pages deployment
- Fix git config issues for gh-pages

### Documentation
- Update deltaTime parameter to deltaFrames
- Add coveralls badge and configure npm package files
- Update readme

### Tests
- Improve code coverage to 100% for core modules

### Build System
- Bump version
- Try and fix gh-pages action usage