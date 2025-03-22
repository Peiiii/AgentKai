"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalStatus = void 0;
// 目标状态枚举
var GoalStatus;
(function (GoalStatus) {
    GoalStatus["ACTIVE"] = "active";
    GoalStatus["COMPLETED"] = "completed";
    GoalStatus["FAILED"] = "failed";
    GoalStatus["PENDING"] = "pending";
})(GoalStatus || (exports.GoalStatus = GoalStatus = {}));
// 删除不存在的导入
// export * from './consciousness'; 
