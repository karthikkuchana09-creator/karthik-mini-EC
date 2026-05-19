export { default as queryClient } from './queryClient';
export {
  tasksKeys,
  useTasks,
  useTask,
  useKanbanTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateTaskStatus,
} from './useTasksQuery';
export {
  dashboardKeys,
  useDashboardSummary,
  useTaskDistribution,
  useDashboardNotifications,
} from './useDashboardQuery';
export {
  notificationKeys,
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from './useNotificationsQuery';
export {
  usersKeys,
  useUsers,
  useUser,
  useUpdateUser,
  useToggleUserActive,
} from './useUsersQuery';
export {
  approvalKeys,
  useApprovals,
  useApprovalHistory,
  useUpdateApproval,
} from './useApprovalsQuery';
