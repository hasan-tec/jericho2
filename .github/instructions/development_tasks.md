# Jira Clone Development Tasks

This file tracks the progress of the Jira clone development. The AI should refer to and update this list using the TASK_MANAGER_MCP tool.

## MVP Phase (Simple Version)

- [x] Define Supabase database schema for MVP tasks (title, description, type, assignee, status).
- [x] Set up Supabase project and connect application.
- [x] Implement user authentication (basic login/signup using Supabase Auth).
- [x] Create Next.js pages/components for Task List view.
- [x] Implement fetching tasks from Supabase for the list view.
- [x] Create Next.js pages/components for Create New Task form.
- [x] Implement submitting new tasks to Supabase.
- [x] Create Next.js pages/components for View/Edit Task details.
- [x] Implement fetching a single task's details from Supabase.
- [x] Implement updating task details in Supabase.
- [x] Basic navigation between pages.
- [ ] Ensure application is usable for up to 20 users.

## UI Revamp & Feature Enhancement (Jira-like with shadcn/ui)

- [x] Initialize and configure shadcn/ui.
- [x] Add core shadcn/ui components (Button, Input, Card, Dialog, Table, Select, Dropdown Menu, Avatar, Label, Textarea, Badge).
- [x] Refactor Core Components with shadcn/ui:
  - [x] `Navbar.tsx`
  - [x] `AuthForm.tsx`
  - [x] `CreateTaskForm.tsx`
  - [x] `TaskList.tsx`
  - [x] `TaskDetailView.tsx`
- [x] Implement Kanban Board View:
  - [x] Create `KanbanBoard.tsx` component and `/board` page.
  - [x] Add `order` column to `tasks` table in Supabase (manual step for user).
  - [x] Fetch and group tasks by status for the board.
  - [x] Display tasks as cards in status columns.
  - [x] Implement drag-and-drop for task status changes and reordering within columns (using `@hello-pangea/dnd`).
- [x] Styling and UX Polish (Jira-like):
  - [x] Update navigation/layout to resemble Jira (simplified).
  - [x] Style task cards (list and board) like Jira items.
  - [x] Ensure forms are clean and use shadcn/ui effectively.
- [x] Implement User Avatars (Simple):
  - [x] Display placeholder or initial-based avatars for assignees (using ui-avatars.com in Kanban cards).
  - [x] (Optional) Integrate with Supabase user profiles if expanded. (Implemented in TaskList.tsx and KanbanBoard.tsx)

- [ ] Styling improvements for a better user experience. (Superseded by UI Revamp)
- [x] Add basic error handling and user feedback (e.g., toast notifications for success/failure of operations). (Implemented in refactored components)
- [x] (Optional) Filter tasks by status or assignee on the Task List view. (Status and Assignee filters implemented)
- [x] (Optional) Basic sorting of tasks in the Task List view. (Client-side sorting implemented)

## Post-MVP / Future Enhancements

- [x] Real-time updates for task changes (e.g., using Supabase Realtime). (Implemented in TaskList.tsx and KanbanBoard.tsx)
- [x] User profiles/avatars. (Implemented with Supabase profiles and ui-avatars fallback)
- [ ] Ability to assign users to tasks from a list of registered users.
- [ ] Commenting on tasks.
- [ ] File attachments for tasks.
- [ ] More advanced filtering and sorting options.
- [ ] Dashboard view with task statistics.
- [ ] Email notifications.
- [x] Drag-and-drop task reordering/status changes (Kanban-style board). (Addressed in UI Revamp)
- [ ] Unit and integration tests.
- [ ] Deployment to a hosting platform (e.g., Vercel, Netlify).