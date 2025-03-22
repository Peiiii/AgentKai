import * as fs from 'fs/promises';
import * as path from 'path';
import { Goal, GoalStorageProvider, Memory, StorageProvider } from '../types';
import { Logger } from '../utils/logger';

export class FileSystemStorage implements StorageProvider, GoalStorageProvider {
    private basePath: string;
    private goalsPath: string;
    private memoriesPath: string;
    private initialized: Promise<void>;
    private logger: Logger;

    constructor(basePath: string = '.data') {
        this.basePath = basePath;
        this.goalsPath = path.join(basePath, 'goals');
        this.memoriesPath = path.join(basePath, 'memories');
        this.logger = new Logger('FileSystemStorage');
        this.initialized = this.init().catch((error) => {
            this.logger.error('初始化存储目录失败:', error);
            throw error;
        });
    }

    private async init() {
        await fs.mkdir(this.basePath, { recursive: true });
        await fs.mkdir(this.goalsPath, { recursive: true });
        await fs.mkdir(this.memoriesPath, { recursive: true });
    }

    private async ensureInitialized() {
        await this.initialized;
    }

    // StorageProvider 接口实现
    async save(key: string, data: any): Promise<void> {
        await this.ensureInitialized();
        const filePath = path.join(this.basePath, `${key}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    async load(key: string): Promise<any> {
        await this.ensureInitialized();
        const filePath = path.join(this.basePath, `${key}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    async delete(key: string): Promise<void> {
        await this.ensureInitialized();
        const filePath = path.join(this.basePath, `${key}.json`);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // 忽略文件不存在的错误
        }
    }

    async list(): Promise<string[]> {
        await this.ensureInitialized();
        const files = await fs.readdir(this.basePath);
        return files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
    }

    async clear(): Promise<void> {
        await this.ensureInitialized();
        await fs.rm(this.basePath, { recursive: true, force: true });
        await this.init();
    }

    // GoalStorageProvider 接口实现
    async saveGoal(goal: Goal): Promise<void> {
        await this.ensureInitialized();
        const filePath = path.join(this.goalsPath, `${goal.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(goal, null, 2));
    }

    async loadGoal(id: string): Promise<Goal> {
        await this.ensureInitialized();
        const filePath = path.join(this.goalsPath, `${id}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`目标 ${id} 不存在`);
        }
    }

    async deleteGoal(id: string): Promise<void> {
        await this.ensureInitialized();
        const filePath = path.join(this.goalsPath, `${id}.json`);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // 忽略文件不存在的错误
        }
    }

    async listGoals(): Promise<Goal[]> {
        await this.ensureInitialized();
        const files = await fs.readdir(this.goalsPath);
        const goals: Goal[] = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(this.goalsPath, file);
                const data = await fs.readFile(filePath, 'utf-8');
                goals.push(JSON.parse(data));
            }
        }
        return goals;
    }

    async saveGoals(goals: Goal[]): Promise<void> {
        await this.ensureInitialized();
        // 获取现有文件列表
        const existingFiles = await fs.readdir(this.goalsPath);
        const newIds = new Set(goals.map((g) => g.id));

        // 删除不再存在的目标文件
        for (const file of existingFiles) {
            const id = file.slice(0, -5);
            if (!newIds.has(id)) {
                await fs.unlink(path.join(this.goalsPath, file));
            }
        }

        // 保存或更新目标
        for (const goal of goals) {
            const filePath = path.join(this.goalsPath, `${goal.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(goal, null, 2));
        }
    }

    async loadGoals(): Promise<Goal[]> {
        await this.ensureInitialized();
        try {
            const files = await fs.readdir(this.goalsPath);
            const goals: Goal[] = [];

            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                try {
                    const data = await fs.readFile(path.join(this.goalsPath, file), 'utf-8');
                    const goal = JSON.parse(data);
                    goals.push(goal);
                } catch (err) {
                    this.logger.warn('加载目标失败:', { file, error: err });
                }
            }

            return goals;
        } catch (error) {
            this.logger.error('读取目标目录失败:', error);
            return [];
        }
    }

    // Memory 相关方法
    async saveMemory(memory: Memory): Promise<void> {
        await this.ensureInitialized();
        const filePath = path.join(this.memoriesPath, `${memory.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
    }

    async loadMemory(id: string): Promise<Memory> {
        await this.ensureInitialized();
        const filePath = path.join(this.memoriesPath, `${id}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`记忆 ${id} 不存在`);
        }
    }

    async deleteMemory(id: string): Promise<void> {
        await this.ensureInitialized();
        const filePath = path.join(this.memoriesPath, `${id}.json`);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // 忽略文件不存在的错误
        }
    }

    async listMemories(): Promise<Memory[]> {
        await this.ensureInitialized();
        const files = await fs.readdir(this.memoriesPath);
        const memories: Memory[] = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(this.memoriesPath, file);
                const data = await fs.readFile(filePath, 'utf-8');
                memories.push(JSON.parse(data));
            }
        }
        return memories;
    }

    async saveMemories(memories: Memory[]): Promise<void> {
        await this.ensureInitialized();
        // 获取现有文件列表
        const existingFiles = await fs.readdir(this.memoriesPath);
        const newIds = new Set(memories.map((m) => m.id));

        // 删除不再存在的记忆文件
        for (const file of existingFiles) {
            const id = file.slice(0, -5);
            if (!newIds.has(id)) {
                await fs.unlink(path.join(this.memoriesPath, file));
            }
        }

        // 保存或更新记忆
        for (const memory of memories) {
            const filePath = path.join(this.memoriesPath, `${memory.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
        }
    }

    async loadMemories(): Promise<Memory[]> {
        await this.ensureInitialized();
        try {
            const files = await fs.readdir(this.memoriesPath);
            const memories: Memory[] = [];

            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                try {
                    const data = await fs.readFile(path.join(this.memoriesPath, file), 'utf-8');
                    const memory = JSON.parse(data);
                    memories.push(memory);
                } catch (err) {
                    this.logger.warn('加载记忆失败:', { file, error: err });
                }
            }

            return memories;
        } catch (error) {
            this.logger.error('读取记忆目录失败:', error);
            return [];
        }
    }
}
