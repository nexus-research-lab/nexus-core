import type { OperationActionKind } from "../operation-tool-catalog";

export interface ToolAppIntent {
  app_label: string;
  detail_label: string;
  group_label: string;
  sidebar_title: string;
}

export function tool_app_intent_for_action(action: OperationActionKind): ToolAppIntent {
  if (action === "read") {
    return {
      app_label: "Code",
      detail_label: "读取工作区文件",
      group_label: "读",
      sidebar_title: "工作区读取",
    };
  }
  if (action === "create") {
    return {
      app_label: "Code",
      detail_label: "创建或覆盖文件",
      group_label: "创建",
      sidebar_title: "文件创建",
    };
  }
  if (action === "edit") {
    return {
      app_label: "Code",
      detail_label: "修改工作区文件",
      group_label: "修改",
      sidebar_title: "文件修改",
    };
  }
  if (action === "list" || action === "search") {
    return {
      app_label: "访达",
      detail_label: action === "list" ? "浏览工作区" : "搜索工作区",
      group_label: action === "list" ? "浏览" : "搜索",
      sidebar_title: action === "list" ? "目录浏览" : "内容搜索",
    };
  }
  if (action === "run" || action === "stop") {
    return {
      app_label: "终端",
      detail_label: action === "run" ? "执行命令" : "停止命令",
      group_label: action === "run" ? "运行" : "停止",
      sidebar_title: "终端会话",
    };
  }
  if (action === "web_search" || action === "web_fetch") {
    return {
      app_label: "Safari",
      detail_label: action === "web_search" ? "搜索网页" : "打开网页",
      group_label: action === "web_search" ? "浏览器搜索" : "浏览器读取",
      sidebar_title: "浏览器活动",
    };
  }
  if (action === "task" || action === "task_progress") {
    return {
      app_label: "活动监视器",
      detail_label: action === "task" ? "委派子任务" : "读取子任务输出",
      group_label: "委派",
      sidebar_title: "子任务",
    };
  }
  if (action === "plan") {
    return {
      app_label: "Nexus",
      detail_label: "更新执行计划",
      group_label: "计划",
      sidebar_title: "计划调度",
    };
  }
  if (action === "question") {
    return {
      app_label: "系统设置",
      detail_label: "等待用户输入",
      group_label: "等待",
      sidebar_title: "用户确认",
    };
  }
  if (action === "summary") {
    return {
      app_label: "交付台",
      detail_label: "归档执行结果",
      group_label: "收口",
      sidebar_title: "执行收束",
    };
  }
  return {
    app_label: "Nexus",
    detail_label: "通用工具调用",
    group_label: "工具",
    sidebar_title: "工具会话",
  };
}
