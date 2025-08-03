export interface CommandOptionType {
  keys: string[];
  description: string;
}

export interface CommandType {
  /** All names/aliases for this command (e.g. ["serversetup", "setup"]). */
  names: string[];
  description: string;
  options?: CommandOptionType[];
}

export type CommandOptionValues = Record<string, any>;
