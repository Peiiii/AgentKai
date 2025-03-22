import { GoalManager } from '../GoalManager';
import { GoalStatus } from '../../types';
import { FileSystemStorage } from '../../storage/FileSystemStorage';
import fs from 'fs';
import path from 'path';

describe('GoalManager', () => {
    let goalManager: GoalManager;
    let storage: FileSystemStorage;
    const testStoragePath = path.join(__dirname, '../../../test-data/goals.json');
    
    beforeEach(() => {
        // 确保测试目录存在
        const testDataDir = path.dirname(testStoragePath);
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        
        // 清理测试文件
        if (fs.existsSync(testStoragePath)) {
            fs.unlinkSync(testStoragePath);
        }
        
        storage = new FileSystemStorage(testStoragePath);
        goalManager = new GoalManager(storage);
    });

    afterEach(() => {
        // 清理测试文件
        if (fs.existsSync(testStoragePath)) {
            fs.unlinkSync(testStoragePath);
        }
    });

    test('should add a new goal', async () => {
        const goal = await goalManager.addGoal({
            description: 'Test goal',
            priority: 1,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });
        
        expect(goal.id).toBeDefined();
        expect(goal.status).toBe(GoalStatus.PENDING);
        expect(goal.description).toBe('Test goal');
        expect(goal.priority).toBe(1);
        expect(goal.createdAt).toBeDefined();
        expect(goal.updatedAt).toBeDefined();
        expect(goal.progress).toBe(0);
        expect(goal.dependencies).toEqual([]);
        expect(goal.subGoals).toEqual([]);
        expect(goal.metadata).toEqual({});
    });

    test('should update a goal', async () => {
        const goal = await goalManager.addGoal({
            description: 'Test goal',
            priority: 1,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        const updatedGoal = await goalManager.updateGoal(goal.id, {
            description: 'Updated goal',
            priority: 2,
            status: GoalStatus.ACTIVE
        });

        expect(updatedGoal).not.toBeNull();
        expect(updatedGoal!.description).toBe('Updated goal');
        expect(updatedGoal!.priority).toBe(2);
        expect(updatedGoal!.status).toBe(GoalStatus.ACTIVE);
        expect(updatedGoal!.updatedAt).toBeGreaterThan(goal.updatedAt);
    });

    test('should delete a goal', async () => {
        const goal = await goalManager.addGoal({
            description: 'Test goal',
            priority: 1,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        const result = await goalManager.deleteGoal(goal.id);
        expect(result).toBe(true);

        const deletedGoal = await goalManager.getGoal(goal.id);
        expect(deletedGoal).toBeNull();
    });

    test('should manage goal dependencies', async () => {
        const parentGoal = await goalManager.addGoal({
            description: 'Parent goal',
            priority: 1,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        const childGoal = await goalManager.addGoal({
            description: 'Child goal',
            priority: 2,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        const result = await goalManager.addDependency(childGoal.id, parentGoal.id);
        expect(result).toBe(true);

        const updatedParent = await goalManager.getGoal(parentGoal.id);
        const updatedChild = await goalManager.getGoal(childGoal.id);

        expect(updatedParent!.subGoals).toContain(childGoal.id);
        expect(updatedChild!.dependencies).toContain(parentGoal.id);
    });

    test('should prevent circular dependencies', async () => {
        const goal1 = await goalManager.addGoal({
            description: 'Goal 1',
            priority: 1,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        const goal2 = await goalManager.addGoal({
            description: 'Goal 2',
            priority: 2,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        await goalManager.addDependency(goal2.id, goal1.id);
        const result = await goalManager.addDependency(goal1.id, goal2.id);
        expect(result).toBe(false);
    });

    test('should manage active goals limit', async () => {
        // 添加多个目标
        const goals = await Promise.all([
            goalManager.addGoal({ 
                description: 'Goal 1', 
                priority: 1,
                dependencies: [],
                subGoals: [],
                metadata: {}
            }),
            goalManager.addGoal({ 
                description: 'Goal 2', 
                priority: 2,
                dependencies: [],
                subGoals: [],
                metadata: {}
            }),
            goalManager.addGoal({ 
                description: 'Goal 3', 
                priority: 3,
                dependencies: [],
                subGoals: [],
                metadata: {}
            }),
            goalManager.addGoal({ 
                description: 'Goal 4', 
                priority: 4,
                dependencies: [],
                subGoals: [],
                metadata: {}
            })
        ]);

        // 激活所有目标
        await Promise.all(goals.map(goal => 
            goalManager.updateGoal(goal.id, { status: GoalStatus.ACTIVE })
        ));

        // 平衡活跃目标
        await goalManager.balanceActiveGoals();

        // 检查活跃目标数量
        const activeGoals = await goalManager.getActiveGoals();
        expect(activeGoals.length).toBeLessThanOrEqual(3); // maxActiveGoals = 3

        // 检查优先级最高的目标是否保持活跃
        const highestPriorityGoal = goals.find(g => g.priority === 4);
        const updatedHighestPriority = await goalManager.getGoal(highestPriorityGoal!.id);
        expect(updatedHighestPriority!.status).toBe(GoalStatus.ACTIVE);
    });

    test('should persist goals between instances', async () => {
        // 添加目标
        const goal = await goalManager.addGoal({
            description: 'Test goal',
            priority: 1,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        // 创建新的 GoalManager 实例
        const newGoalManager = new GoalManager(storage);
        
        // 验证目标是否被正确加载
        const loadedGoal = await newGoalManager.getGoal(goal.id);
        expect(loadedGoal).not.toBeNull();
        expect(loadedGoal!.description).toBe(goal.description);
        expect(loadedGoal!.priority).toBe(goal.priority);
    });

    test('should handle goal completion', async () => {
        const parentGoal = await goalManager.addGoal({
            description: 'Parent goal',
            priority: 1,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        const childGoal = await goalManager.addGoal({
            description: 'Child goal',
            priority: 2,
            dependencies: [],
            subGoals: [],
            metadata: {}
        });

        await goalManager.addDependency(childGoal.id, parentGoal.id);

        // 完成子目标
        await goalManager.updateGoal(childGoal.id, { status: GoalStatus.COMPLETED });
        
        // 检查父目标是否自动完成
        const updatedParent = await goalManager.getGoal(parentGoal.id);
        expect(updatedParent!.status).toBe(GoalStatus.COMPLETED);
    });
}); 