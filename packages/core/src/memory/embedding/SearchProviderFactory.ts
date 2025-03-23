import { Logger } from '../../utils/logger';
import { platform } from '../../platform';
import { Storage } from '../../storage/Storage';
import { EmbeddingProvider } from './EmbeddingProvider';
import { HnswSearchProvider } from './HnswSearchProvider';
import { BrowserSearchProvider } from './BrowserSearchProvider';
import { ISearchProvider } from './ISearchProvider';

/**
 * 搜索提供者工厂
 * 根据环境平台创建适合的搜索提供者
 */
export class SearchProviderFactory {
  private static logger = new Logger('SearchProviderFactory');

  /**
   * 创建搜索提供者实例
   * @param indexName 索引名称
   * @param embeddingProvider 嵌入向量提供者
   * @param storage 存储实例
   * @param embedDimension 嵌入向量维度
   * @returns 平台适配的搜索提供者实例
   */
  static createSearchProvider(
    indexName: string,
    embeddingProvider: EmbeddingProvider,
    storage: Storage,
    embedDimension: number = 1024
  ): ISearchProvider {
    // 根据平台类型选择合适的搜索提供者
    if (platform.platformInfo.isNode()) {
      this.logger.info('创建Node环境搜索提供者');
      // 使用数据路径作为HnswSearchProvider的第三个参数
      const dataPath = storage.getBasePath();
      return new HnswSearchProvider(storage, embeddingProvider, dataPath);
    } else if (platform.platformInfo.isBrowser()) {
      this.logger.info('创建浏览器环境搜索提供者');
      return new BrowserSearchProvider(indexName, embeddingProvider, storage, embedDimension);
    } else {
      // 默认使用Node版本
      this.logger.warn('未识别的平台，使用默认Node环境搜索提供者');
      const dataPath = storage.getBasePath();
      return new HnswSearchProvider(storage, embeddingProvider, dataPath);
    }
  }
} 