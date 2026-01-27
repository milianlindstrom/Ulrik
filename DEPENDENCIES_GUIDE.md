# Task Dependencies Guide

## Overview

Task dependencies allow you to create relationships between tasks where one task must be completed before another can begin. This helps manage complex workflows and ensures tasks are completed in the correct order.

## How Dependencies Work

### Basic Concept

- **Depends On**: Task A depends on Task B means Task B must be completed before Task A can start
- **Blocks**: If Task B blocks Task A, then Task A cannot move to "in-progress" until Task B is done
- Tasks can have multiple dependencies
- Dependencies are automatically validated to prevent circular relationships

### Visual Indicators

**On Kanban Cards:**
- 🔒 **Blocked** badge shows when a task is blocked by incomplete dependencies
- Shows count of blocking tasks (e.g., "Blocked by 2")

**In Task Details Modal:**
- Full list of dependencies with their current status
- Shows which tasks this task blocks
- Color-coded badges:
  - 🟢 Green: Dependency is complete
  - 🟠 Orange: Dependency is still in progress

## Using Dependencies

### Adding Dependencies

1. Open a task in the detail modal
2. Scroll to the "Dependencies" section
3. Click the + button
4. Select a task from the dropdown
5. Click "Add"

**Via MCP/AI:**
```
"Make Task A depend on Task B"
```

The AI will call: `add_task_dependency(task_id, depends_on_task_id)`

### Removing Dependencies

1. Open the task detail modal
2. Find the dependency in the list
3. Click the X button next to it

### Viewing Blocked Tasks

**Via Analytics:**
- See "Blocked Tasks" metric on the dashboard

**Via MCP/AI:**
```
"Show me all blocked tasks"
```

Returns: List of tasks blocked by incomplete dependencies

## Business Rules

### Status Validation

- **Cannot** move a task to "in-progress" if it has incomplete dependencies
- Will show error: "Cannot move to in-progress. Task is blocked by: [task titles]"
- **Can** still edit, archive, or delete blocked tasks

### Circular Dependencies

The system prevents circular dependencies:
- ❌ Task A → Task B → Task A (not allowed)
- ❌ Task A → Task B → Task C → Task A (not allowed)
- ✅ Task A → Task B, Task A → Task C (allowed)

### Automatic Checks

- Dependencies are checked in real-time
- When marking a task as "done", system checks if it's blocking other tasks
- Notifications show when completing a task unblocks others

## Best Practices

### When to Use Dependencies

✅ **Good use cases:**
- Sequential workflow steps (design → development → review)
- Tasks that require outputs from other tasks
- Complex projects with clear task ordering
- Preventing premature work on dependent tasks

❌ **Avoid for:**
- Tasks that can be worked on in parallel
- Loose relationships (use tags or projects instead)
- Over-complicating simple workflows

### Organizing Dependencies

1. **Keep it simple**: Don't create deep dependency chains
2. **Use subtasks**: Break down complex tasks with dependencies into subtasks
3. **Review regularly**: Check blocked tasks in analytics
4. **Document reasons**: Add notes in task descriptions explaining why dependencies exist

## MCP Tools Reference

### Available Commands

```typescript
// Add dependency
add_task_dependency(task_id, depends_on_task_id)

// Remove dependency
remove_task_dependency(task_id, depends_on_task_id)

// Get all blocked tasks
get_blocked_tasks()

// Get full dependency chain
get_dependency_chain(task_id)
```

### Example Workflows

**Setting up a project with dependencies:**
```
1. Create tasks for each step
2. Add dependencies in reverse order (final task depends on previous tasks)
3. Review dependency chain
4. Start work on the first task with no dependencies
```

**Breaking a circular dependency:**
```
1. Identify the circular path
2. Remove one dependency in the circle
3. Restructure tasks if needed
4. Consider using subtasks instead
```

## Troubleshooting

### "Cannot move to in-progress" error

**Problem**: Task is blocked by incomplete dependencies

**Solution**:
1. Check which tasks are blocking (shown in error message)
2. Complete those tasks first, OR
3. Remove the dependency if it's no longer needed

### Circular dependency detected

**Problem**: Adding a dependency would create a circular relationship

**Solution**:
1. Review the dependency chain using `get_dependency_chain`
2. Restructure tasks to break the circle
3. Consider if both tasks can be combined or split differently

### Can't find dependency option

**Problem**: Task not showing in dependency dropdown

**Solution**:
- Can't add dependency to self (same task)
- Dependency might already exist
- Task might be archived
- Refresh the task list

## Tips for AI Assistants

When working with dependencies via MCP:

1. **Check for blockers first**: Before moving tasks to in-progress, check dependencies
2. **Explain relationships**: Help users understand why dependencies matter
3. **Suggest alternatives**: If circular dependency detected, suggest restructuring
4. **Monitor blocked tasks**: Periodically call `get_blocked_tasks()` and alert user
5. **Auto-unblock**: When marking a task done, mention if it unblocks other tasks

## See Also

- [Subtasks Guide](./SUBTASKS_GUIDE.md) - For breaking down complex tasks
- [Recurring Tasks Guide](./RECURRING_TASKS_GUIDE.md) - For repetitive workflows
- [MCP Integration](./MCP_QUICKSTART.md) - Full MCP command reference
