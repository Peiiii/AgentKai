import { CLIConfigService } from '../services';

export interface ConfigCommandOptions {
  dataPath?: boolean;
  path?: boolean;
  init?: boolean;
  edit?: boolean;
  get?: string;
  set?: string;
  debug?: boolean;
}

export class ConfigCommand {
  constructor(private configService: CLIConfigService) {}

  async execute(options: ConfigCommandOptions, commandArgs: string[] = []): Promise<void> {
    return this.configService.handleConfigCommand(options, commandArgs);
  }
} 