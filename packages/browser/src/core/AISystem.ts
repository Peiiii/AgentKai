import { BaseAISystem, BaseConfigService, Goal, ISearchProvider, Memory, StorageProvider } from '@agentkai/core';
import { BrowserSearchProvider } from '../memory/embedding';
import { ConfigService } from '../services/config.service';
import { BrowserStorage } from '../storage/BrowserStorage';

export class AISystem extends BaseAISystem {
    createConfigService(): BaseConfigService {
        return new ConfigService();
    }
    createGoalStorage(): StorageProvider<Goal> {
        return new BrowserStorage('/data/goals', 'goals');
    }
    createMemoryStorage(): StorageProvider<Memory> {
        return new BrowserStorage('/data/memory', 'memory');
    }
    createMemorySearchProvider(): ISearchProvider {
        return new BrowserSearchProvider(
            'agentkai-memory-index',
            this.createEmbeddingProvider(),
            this.createMemoryStorage()
        );
    }
}
