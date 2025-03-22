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
const AISystem_1 = require("./core/AISystem");
const dotenv = __importStar(require("dotenv"));
// 加载环境变量
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
    // 创建AI系统实例
    const ai = new AISystem_1.AISystem(config);
    // 添加主目标
    const mainGoal = await ai.addGoal({
        description: '帮助用户完成任务',
        priority: 1,
        dependencies: [],
        subGoals: [],
        metadata: {},
        metrics: {}
    });
    // 添加子目标
    await ai.addGoal({
        description: '理解用户需求',
        priority: 2,
        dependencies: [mainGoal.id],
        subGoals: [],
        metadata: {},
        metrics: {}
    });
    await ai.addGoal({
        description: '提供解决方案',
        priority: 2,
        dependencies: [mainGoal.id],
        subGoals: [],
        metadata: {},
        metrics: {}
    });
    // 处理用户输入
    const input = '我需要帮助';
    const result = await ai.processInput(input);
    console.log('系统输出:', result.output);
    console.log('置信度:', result.confidence);
    console.log('推理过程:', result.reasoning);
    console.log('相关记忆数:', result.relevantMemories?.length || 0);
    console.log('活跃目标数:', result.activeGoals?.length || 0);
}
main().catch(console.error);
