import { BaseConfigService, PlatformServices } from '@agentkai/core';
import { browserPlatform } from '../platform';

/**
 * 配置服务，用于管理所有配置
 */
export class ConfigService extends BaseConfigService {
    getPlatform(): PlatformServices {
        return browserPlatform;
    }
    ensureDirExists(): void {
        this.checkAndCreateDir(browserPlatform.path.join(browserPlatform.path.home(), '.agentkai'));
        this.checkAndCreateDir(browserPlatform.path.join(browserPlatform.path.home(), '.agentkai', 'goals'));
        this.checkAndCreateDir(browserPlatform.path.join(browserPlatform.path.home(), '.agentkai', 'memory'));
    }
    private checkAndCreateDir(dir: string): void {
        if (!browserPlatform.fs.exists(dir)) {
            browserPlatform.fs.mkdir(dir, { recursive: true });
        }
    }
}
