import { BaseAISystem, BaseConfigService, Goal, ISearchProvider, Memory } from '@agentkai/core';
import { StorageProvider } from '@agentkai/core/src/storage';
import { HnswSearchProvider } from '../memory/embedding/HnswSearchProvider';
import { platform } from '../platform';
import { ConfigService } from '../services/config.service';
import { FileSystemStorage } from '../storage/FileSystemStorage';

const BASE_DIR = platform.path.join(platform.path.home(), '.agentkai');

export class AISystem extends BaseAISystem {
    createConfigService(): BaseConfigService {
        return new ConfigService();
    }
    createGoalStorage(): StorageProvider<Goal> {
        const dataPath = this.getConfigService().getDataDir();
        return new FileSystemStorage(platform.path.join(dataPath, 'goals'));
    }
    createMemoryStorage(): StorageProvider<Memory> {
        const dataPath = this.getConfigService().getDataDir();
        return new FileSystemStorage(platform.path.join(dataPath, 'memory'));
    }
    createMemorySearchProvider(): ISearchProvider {
        return new HnswSearchProvider(
            this.createMemoryStorage(),
            this.createEmbeddingProvider(),
            platform.path.join(BASE_DIR, 'memory')
        );
    }
}
