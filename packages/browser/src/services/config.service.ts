import { BaseConfigService, PlatformServices } from '@agentkai/core';
import { platform } from '../platform';

/**
 * 配置服务，用于管理所有配置
 */
export class ConfigService extends BaseConfigService {
    getPlatform(): PlatformServices {
        return platform;
    }
    ensureDirExists(): void {
        this.checkAndCreateDir(platform.path.join(platform.path.home(), '.agentkai'));
        this.checkAndCreateDir(platform.path.join(platform.path.home(), '.agentkai', 'goals'));
        this.checkAndCreateDir(platform.path.join(platform.path.home(), '.agentkai', 'memory'));
    }
    private checkAndCreateDir(dir: string): void {
        if (!platform.fs.exists(dir)) {
            platform.fs.mkdir(dir, { recursive: true });
        }
    }
}
