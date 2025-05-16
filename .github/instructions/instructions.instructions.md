---
applyTo: "**/*.{js,jsx,ts,tsx,css,scss,md}"
description: "Guidelines for developing the simple Jira clone MVP."
---
# AI Instructions: Simple Jira Clone MVP Development

**Context:** We are building the Minimum Viable Product (MVP) of a Jira clone for a small team (up to 20 users). The focus is on core task management features defined in `prd_mvp.md`.

**Overall Approach:**
1.  Prioritize simplicity and speed of implementation.
2.  Stick strictly to the features defined in `prd_mvp.md`. Do not add extra complexity.
3.  Build a solid, clean codebase that can be extended later.
4.  Refer to `development_tasks.md` to understand the current progress and update it upon completing tasks.

**Technology Stack:**
*   **Backend & Database:** Supabase. Utilize Supabase features for database schema, authentication, and potentially basic real-time functionality if simple.
*   **Frontend:** Next.js. Use standard Next.js practices. Refer to `CONTEXT7_MCP` for the latest best practices and package information if needed (e.g., Next.js 15 related info).
*   **UI/UX:** Keep the user interface functional and straightforward. `FIGMA_MCP` *might* be helpful for initial layout ideas if contemplating specific components, but don't over-engineer UI for the MVP.

**MCP Usage:**
*   **`SEQUENTIAL_THINKING_MCP`**: Use this when breaking down larger features into smaller coding steps, especially for planning the implementation order based on `prd_mvp.md`.
*   **`TASK_MANAGER_MCP`**: **Crucially, use this tool to interact with and update the `development_tasks.md` file.** When a task is completed, mark it as `[x]`. When suggesting new tasks, add them as `[ ]`.
*   **`FIGMA_MCP`**: Useful if we discuss UI components or basic screen layouts. Can provide examples or suggestions based on design concepts.
*   **`FIRECRAWL_MCP`**: Use for fetching documentation or examples from the web related to Supabase, Next.js, or specific libraries if standard documentation isn't sufficient.
*   **`SUPABASE_MCP`**: **Essential** for all backend and database related tasks. Use it to understand Supabase API usage, schema design, authentication flows, etc.
*   **`CONTEXT7_MCP`**: Use to get the latest information, best practices, or potential issues regarding the technology stack, particularly Next.js and its associated libraries.
*   **`TAVILLY_MCP`**: Can be used for broader web searches if `FIRECRAWL_MCP` or the other specific tools don't yield results, perhaps for general examples of similar simple applications or UI patterns.

**Code Guidelines:**
*   Write clean, commented code.
*   Focus on functional components for the frontend.
*   Implement basic error handling.
*   Ensure data interactions with Supabase are secure following their recommended patterns for row-level security (RLS) if applicable for the 20-user scope.

**Workflow:**
1.  Start by reviewing `prd_mvp.md` and `development_tasks.md`.
2.  Use `SEQUENTIAL_THINKING_MCP` to plan the next coding task based on `development_tasks.md`.
3.  Use relevant MCPs (`SUPABASE_MCP`, `CONTEXT7_MCP`, `FIRECRAWL_MCP`, `FIGMA_MCP`, `TAVILLY_MCP`) as needed during implementation.
4.  Write/edit code files using agent mode tools (`create_file`, `insert_edit_into_file`, etc.).
5.  **Update `development_tasks.md` using `TASK_MANAGER_MCP` when a task is completed.**
6.  Always refer back to `prd_mvp.md` to stay within scope.

**Constraint:** Remember the 20-user target. This simplifies many aspects (e.g., no need for complex sharding or massive database optimizations *yet*).

**Ask Me:** If any requirements are unclear or if you need clarification on the next step.