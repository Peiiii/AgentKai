"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemStorage = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
class FileSystemStorage {
    constructor(basePath = '.data') {
        this.basePath = basePath;
        this.goalsPath = path.join(basePath, 'goals');
        this.memoriesPath = path.join(basePath, 'memories');
        this.logger = new logger_1.Logger('FileSystemStorage');
        this.initialized = this.init().catch((error) => {
            this.logger.error('初始化存储目录失败:', error);
            throw error;
        });
    }
    async init() {
        await fs.mkdir(this.basePath, { recursive: true });
        await fs.mkdir(this.goalsPath, { recursive: true });
        await fs.mkdir(this.memoriesPath, { recursive: true });
    }
    async ensureInitialized() {
        await this.initialized;
    }
    // StorageProvider 接口实现
    async save(key, data) {
        await this.ensureInitialized();
        const filePath = path.join(this.basePath, `${key}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }
    async load(key) {
        await this.ensureInitialized();
        const filePath = path.join(this.basePath, `${key}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            return null;
        }
    }
    async delete(key) {
        await this.ensureInitialized();
        const filePath = path.join(this.basePath, `${key}.json`);
        try {
            await fs.unlink(filePath);
        }
        catch (error) {
            // 忽略文件不存在的错误
        }
    }
    async list() {
        await this.ensureInitialized();
        const files = await fs.readdir(this.basePath);
        return files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
    }
    async clear() {
        await this.ensureInitialized();
        await fs.rm(this.basePath, { recursive: true, force: true });
        await this.init();
    }
    // GoalStorageProvider 接口实现
    async saveGoal(goal) {
        await this.ensureInitialized();
        const filePath = path.join(this.goalsPath, `${goal.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(goal, null, 2));
    }
    async loadGoal(id) {
        await this.ensureInitialized();
        const filePath = path.join(this.goalsPath, `${id}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            throw new Error(`目标 ${id} 不存在`);
        }
    }
    async deleteGoal(id) {
        await this.ensureInitialized();
        const filePath = path.join(this.goalsPath, `${id}.json`);
        try {
            await fs.unlink(filePath);
        }
        catch (error) {
            // 忽略文件不存在的错误
        }
    }
    async listGoals() {
        await this.ensureInitialized();
        const files = await fs.readdir(this.goalsPath);
        const goals = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(this.goalsPath, file);
                const data = await fs.readFile(filePath, 'utf-8');
                goals.push(JSON.parse(data));
            }
        }
        return goals;
    }
    async saveGoals(goals) {
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
    async loadGoals() {
        await this.ensureInitialized();
        try {
            const files = await fs.readdir(this.goalsPath);
            const goals = [];
            for (const file of files) {
                if (!file.endsWith('.json'))
                    continue;
                try {
                    const data = await fs.readFile(path.join(this.goalsPath, file), 'utf-8');
                    const goal = JSON.parse(data);
                    goals.push(goal);
                }
                catch (err) {
                    this.logger.warn('加载目标失败:', { file, error: err });
                }
            }
            return goals;
        }
        catch (error) {
            this.logger.error('读取目标目录失败:', error);
            return [];
        }
    }
    // Memory 相关方法
    async saveMemory(memory) {
        await this.ensureInitialized();
        const filePath = path.join(this.memoriesPath, `${memory.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
    }
    async loadMemory(id) {
        await this.ensureInitialized();
        const filePath = path.join(this.memoriesPath, `${id}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            throw new Error(`记忆 ${id} 不存在`);
        }
    }
    async deleteMemory(id) {
        await this.ensureInitialized();
        const filePath = path.join(this.memoriesPath, `${id}.json`);
        try {
            await fs.unlink(filePath);
        }
        catch (error) {
            // 忽略文件不存在的错误
        }
    }
    async listMemories() {
        await this.ensureInitialized();
        const files = await fs.readdir(this.memoriesPath);
        const memories = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(this.memoriesPath, file);
                const data = await fs.readFile(filePath, 'utf-8');
                memories.push(JSON.parse(data));
            }
        }
        return memories;
    }
    async saveMemories(memories) {
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
    async loadMemories() {
        await this.ensureInitialized();
        try {
            const files = await fs.readdir(this.memoriesPath);
            const memories = [];
            for (const file of files) {
                if (!file.endsWith('.json'))
                    continue;
                try {
                    const data = await fs.readFile(path.join(this.memoriesPath, file), 'utf-8');
                    const memory = JSON.parse(data);
                    memories.push(memory);
                }
                catch (err) {
                    this.logger.warn('加载记忆失败:', { file, error: err });
                }
            }
            return memories;
        }
        catch (error) {
            this.logger.error('读取记忆目录失败:', error);
            return [];
        }
    }
}
exports.FileSystemStorage = FileSystemStorage;
