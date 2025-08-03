#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import yaml from "yaml";
import { CommandOptionType, CommandType, CommandOptionValues } from "./Types";
import ls from "./commands/ls";
import login from "./commands/login";
import deploy from "./commands/deploy";
import setup from "./commands/setup";
import logout from "./commands/logout";

const program = new Command();

program
  .name("caprover-cli")
  .description("A CLI application with cmd1 and cmd2 commands")
  .version("1.0.0");

const cliDefinitionsContent = fs.readFileSync(
  path.join(__dirname, "../cliDefinitions.yaml"),
  "utf8"
);
const cliDefinitions = yaml.parse(cliDefinitionsContent).commands;

const commandsImpl = {
  list: ls,
  login: login,
  logout: logout,
  setup: setup,
  deploy: deploy,
} as Record<string, (input: CommandOptionValues) => Promise<void>>;

cliDefinitions.forEach((command: CommandType) => {
  const subCommand = program
    .command(command.names[0])
    .description(command.description);

  if (command.names.length > 1) {
    command.names.forEach((name) => {
      if (name !== command.names[0]) {
        subCommand.alias(name);
      }
    });
  }

  if (command.options) {
    command.options.forEach((opt: CommandOptionType) => {
      subCommand.option(opt.keys.join(", "), opt.description);
    });
  }

  subCommand.action((_str, options) => {
    const names = command.names;
    const keyFound = Object.keys(commandsImpl).find((key) => {
      return names.includes(key);
    });
    if (!keyFound) {
      console.error(`Command ${names.join(", ")} not found`);
      return;
    }

    const commandImpl = commandsImpl[keyFound as keyof typeof commandsImpl];

    if (commandImpl) {
      commandImpl(options);
    } else {
      console.error(`Command ${names.join(", ")} not found`);
    }
  });
});

program.parse();
