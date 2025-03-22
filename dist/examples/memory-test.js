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
const AISystem_1 = require("../core/AISystem");
const dotenv = __importStar(require("dotenv"));
const uuid_1 = require("uuid");
dotenv.config();
const config = {
    modelConfig: {
        model: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY || '',
        modelName: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7
    },
    memoryConfig: {
        vectorDimensions: 1536,
        maxMemories: 1000,
        similarityThreshold: 0.8,
        shortTermCapacity: 10,
        importanceThreshold: 0.5
    },
    decisionConfig: {
        confidenceThreshold: 0.7,
        maxRetries: 3,
        maxReasoningSteps: 5,
        minConfidenceThreshold: 0.6
    }
};
async function main() {
    const ai = new AISystem_1.AISystem(config);
    // 添加记忆
    const memories = [
        {
            id: (0, uuid_1.v4)(),
            content: '用户喜欢简洁的回答',
            timestamp: Date.now(),
            importance: 0.8,
            metadata: {}
        },
        {
            id: (0, uuid_1.v4)(),
            content: '用户对技术很感兴趣',
            timestamp: Date.now(),
            importance: 0.7,
            metadata: {}
        },
        {
            id: (0, uuid_1.v4)(),
            content: '用户经常问关于编程的问题',
            timestamp: Date.now(),
            importance: 0.9,
            metadata: {}
        }
    ];
    for (const memory of memories) {
        await ai.addMemory(memory);
    }
    // 搜索相关记忆
    const query = '用户偏好';
    const results = await ai.searchMemories(query);
    console.log('搜索结果:', results);
    // 清理资源
    await ai.clearGoals();
}
main().catch(console.error);
