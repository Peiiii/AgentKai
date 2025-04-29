import { EnvProvider } from '@agentkai/core';

/**
 * 浏览器环境的环境变量提供者实现，使用localStorage
 */
export class BrowserEnvProvider implements EnvProvider {
    private readonly STORAGE_KEY_PREFIX = 'agentkai_env_';
    
    get(key: string, defaultValue?: string): string | undefined {
        const value = localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
        return value !== null ? value : defaultValue;
    }
    
    set(key: string, value: string): void {
        localStorage.setItem(this.STORAGE_KEY_PREFIX + key, value);
    }
    
    getAll(): Record<string, string> {
        const env: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
                const envKey = key.slice(this.STORAGE_KEY_PREFIX.length);
                const value = localStorage.getItem(key);
                if (value !== null) {
                    env[envKey] = value;
                }
            }
        }
        return env;
    }
} 