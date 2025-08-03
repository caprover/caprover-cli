# Caprover CLI

A simple CLI application built with Node.js, TypeScript, and Commander.js.

## Installation

```bash
npm install
```

## Development

### Build the project

```bash
npm run build
```

### Development mode (using ts-node)

```bash
npm run dev cmd1
npm run dev cmd2
```

## Usage

### Run the built version

```bash
npm start cmd1
npm start cmd2
```

### Run with node directly

```bash
node dist/cli.js cmd1
node dist/cli.js cmd2
```

### Install globally (optional)

```bash
npm install -g .
caprover-cli cmd1
caprover-cli cmd2
```

## Commands

- `cmd1` - Prints "1"
- `cmd2` - Prints "2"

## Help

To see all available commands and options:

```bash
node dist/cli.js --help
```

To see help for a specific command:

```bash
node dist/cli.js cmd1 --help
node dist/cli.js cmd2 --help
```

## Project Structure

```
├── src/           # TypeScript source files
│   └── cli.ts     # Main CLI application
├── dist/          # Compiled JavaScript output
├── package.json   # Project configuration
├── tsconfig.json  # TypeScript configuration
└── README.md      # This file
```

## Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `npm run build` to compile to JavaScript
3. Test with `npm start` or `npm run dev` for development
