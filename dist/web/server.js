"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const AISystem_1 = require("../core/AISystem");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// 加载环境变量
dotenv_1.default.config();
// 创建Express应用
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer);
// 创建AI系统实例
const config = {
    modelConfig: {
        apiKey: process.env.QWEN_API_KEY || '',
        modelName: 'qwen-plus',
        maxTokens: 2000,
        temperature: 0.7
    },
    memoryConfig: {
        vectorDimensions: 1024,
        maxMemories: 1000,
        similarityThreshold: 0.8
    },
    decisionConfig: {
        confidenceThreshold: 0.7,
        maxRetries: 3
    }
};
const aiSystem = new AISystem_1.AISystem(config);
// 配置中间件
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
app.use(express_1.default.json());
// API路由
app.get('/api/memories', async (req, res) => {
    try {
        const query = req.query.q;
        const memories = query
            ? await aiSystem.searchMemories(query)
            : await aiSystem.getAllMemories();
        res.json(memories);
    }
    catch (error) {
        res.status(500).json({ error: '获取记忆失败' });
    }
});
app.get('/api/goals/:id', async (req, res) => {
    try {
        const goal = await aiSystem.getGoal(req.params.id);
        if (goal) {
            res.json(goal);
        }
        else {
            res.status(404).json({ error: '目标不存在' });
        }
    }
    catch (error) {
        res.status(500).json({ error: '获取目标失败' });
    }
});
app.get('/api/goals', async (req, res) => {
    try {
        const goals = await aiSystem.getActiveGoals();
        res.json(goals);
    }
    catch (error) {
        res.status(500).json({ error: '获取目标列表失败' });
    }
});
app.post('/api/goals', async (req, res) => {
    try {
        const { description, priority = 1, metadata = {} } = req.body;
        const goal = await aiSystem.addGoal({
            description,
            priority,
            metadata,
            dependencies: [],
            subGoals: []
        });
        res.json(goal);
    }
    catch (error) {
        res.status(500).json({ error: '创建目标失败' });
    }
});
// WebSocket处理
io.on('connection', (socket) => {
    console.log('新的WebSocket连接');
    socket.on('chat message', async (message) => {
        try {
            const result = await aiSystem.processInput(message);
            socket.emit('chat response', {
                output: result.output,
                confidence: result.confidence,
                reasoning: result.reasoning,
                relevantMemories: result.relevantMemories,
                activeGoals: result.activeGoals
            });
            // 存储对话记忆
            await aiSystem.processInput(`用户: ${message}\nAI: ${result.output}`);
        }
        catch (error) {
            console.error('处理消息时出错:', error);
            socket.emit('error', '处理消息时出错');
        }
    });
    socket.on('disconnect', () => {
        console.log('WebSocket连接断开');
    });
});
// 启动服务器
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
