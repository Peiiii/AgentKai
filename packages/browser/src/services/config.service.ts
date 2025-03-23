import { BaseConfigService, PlatformServices } from '@agentkai/core';
import { platform } from '../platform';


/**
 * 配置服务，用于管理所有配置
 */
export class ConfigService extends BaseConfigService {
    getPlatform(): PlatformServices {
        return platform;
    }
}
