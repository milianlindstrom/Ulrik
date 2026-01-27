# Subtasks Guide

## Overview

Subtasks help you break down complex tasks into smaller, manageable pieces. They're perfect for multi-step workflows, detailed checklists, or when a task feels too big to tackle at once.

## Key Concepts

### Parent-Child Relationship

- **Parent Task**: The main task that contains subtasks
- **Subtask**: A smaller task that belongs to a parent
- Subtasks inherit the project from their parent
- Subtasks can have their own status, priority, and due dates
- **Max depth**: 1 level (subtasks cannot have their own subtasks)

### Progress Tracking

- Parent tasks show completion progress: "3/5 subtasks completed"
- Visual progress bar in task details
- Subtasks are counted in analytics
- Completing all subtasks doesn't auto-complete the parent

## Creating Subtasks

### Via Task Details Modal

1. Open a task (the parent)
2. Scroll to "Subtasks" section
3. Type subtask title in the input field
4. Press Enter or click the + button
5. Subtask is created instantly

**Quick add multiple**:
- Press Enter after each subtask
- They're created one by one
- All inherit parent's project

### Via MCP/AI

```
"Break down 'Build landing page' into subtasks"
```

The AI will:
1. Analyze the parent task
2. Create logical subtasks
3. Call `create_subtask()` for each one
4. Return summary of created subtasks

Example API call:
```typescript
create_subtask({
  parent_task_id: "parent_id",
  title: "Design mockup",
  priority: "high",
  estimated_hours: 2
})
```

## Managing Subtasks

### Viewing Subtasks

**On Kanban Cards**:
- Parent shows badge: "📋 3/5 subtasks"
- Shows completion count
- Subtasks are hidden by default (not shown as separate cards)

**In Task Details**:
- Full list with checkboxes
- Status badges for each subtask
- Progress bar showing X/Y completed
- Click subtask to open its own detail modal

### Completing Subtasks

**Quick toggle**:
1. Open parent task
2. Click checkbox next to subtask
3. Status toggles between `todo` and `done`

**Full edit**:
1. Click on the subtask title
2. Opens detail modal
3. Edit any field like a normal task
4. Can change status to any value (not just done)

### Reordering Subtasks

Currently subtasks are shown in creation order.

**Future feature**: Drag handles to reorder

### Converting Tasks

**Make task a subtask**:
1. Edit the task
2. Set `parent_task_id` field
3. Task becomes a subtask

**Promote subtask to task**:
1. Edit the subtask
2. Remove `parent_task_id`
3. Subtask becomes an independent task

## Business Rules

### Inheritance

Subtasks inherit:
- ✅ **Project**: Always same as parent
- ❌ **Status**: Independent (can be different from parent)
- ❌ **Priority**: Independent
- ❌ **Due Date**: Independent

### Status Independence

- Parent can be "in-progress" with subtasks in "todo"
- Parent can be "done" even if subtasks aren't (manual completion)
- Subtasks can be "done" while parent is "in-progress"
- No automatic status updates

### Deletion

- Deleting a parent task also deletes all its subtasks
- Deleting a subtask doesn't affect the parent
- Archive parent → subtasks are also archived

## Display Behavior

### Kanban View

**Default**:
- Only parent tasks show as cards
- Subtasks are hidden
- Parent shows completion count badge

**Future filter option**:
- "Show all subtasks" mode
- Subtasks appear as regular cards
- Visually indented or marked as subtasks

### Task List

When filtering or searching:
- Both parents and subtasks can appear
- Subtask cards show parent relationship
- Can open either parent or subtask directly

## Progress Tracking

### Completion Metrics

**Visual indicators**:
- Badge: "📋 3/5 subtasks"
- Progress bar: 60% complete
- Color-coded:
  - 🔴 0% - No progress
  - 🟡 1-99% - In progress
  - 🟢 100% - All done

**In Analytics**:
- "Subtasks" metric shows tasks with subtasks
- "Avg X per parent task" statistic
- Counts toward total task metrics

### Best Practices

**When to use subtasks**:
- ✅ Task has 3-7 distinct steps
- ✅ Each step can be completed independently
- ✅ You want to track partial progress
- ✅ Breaking down helps with estimation

**When NOT to use subtasks**:
- ❌ Only 1-2 steps (use checklist in description instead)
- ❌ Steps must be done in exact order (use dependencies)
- ❌ Each "subtask" is actually a full task (use separate tasks)
- ❌ Over 10 subtasks (break parent into multiple tasks)

## Use Cases

### Project Breakdown

**Parent**: "Launch marketing campaign"
**Subtasks**:
- Design ad creatives
- Write copy
- Set up tracking
- Schedule posts
- Monitor performance

### Development Tasks

**Parent**: "Implement user authentication"
**Subtasks**:
- Create login form
- Add password validation
- Implement JWT tokens
- Add logout functionality
- Write tests

### Content Creation

**Parent**: "Write blog post"
**Subtasks**:
- Research topic
- Create outline
- Write first draft
- Edit and revise
- Add images
- Publish and promote

## MCP Tools Reference

```typescript
// Create subtask
create_subtask({
  parent_task_id: "parent_id",
  title: "Subtask title",
  description?: "Details",
  priority?: "medium",
  estimated_hours?: 1
})

// List subtasks of a parent
list_subtasks(parent_task_id)

// Update subtask (same as regular task)
update_task(subtask_id, { status: "done" })

// Delete subtask
delete_task(subtask_id)

// Convert to subtask
update_task(task_id, { parent_task_id: "parent_id" })

// Promote subtask to task
update_task(subtask_id, { parent_task_id: null })
```

## AI Assistant Patterns

### Breaking Down Tasks

When user says: "This task is too big"

**AI workflow**:
1. Analyze task title and description
2. Identify logical steps
3. Create 3-7 subtasks
4. Set appropriate priorities
5. Provide summary

```
User: "Break down 'Build dashboard'"

AI:
1. create_subtask(parent_id, "Design wireframe")
2. create_subtask(parent_id, "Set up components")
3. create_subtask(parent_id, "Connect data sources")
4. create_subtask(parent_id, "Add charts")
5. create_subtask(parent_id, "Style and polish")

Response: "I've broken it into 5 subtasks: design, setup, data, charts, and polish"
```

### Progress Updates

When checking status:
```
User: "How's the landing page coming along?"

AI:
1. get_task(landing_page_id)
2. Check subtasks progress
3. Report: "Landing page is 4/6 subtasks complete. 
   Still need: browser testing and SEO optimization"
```

### Smart Prioritization

Suggest working on subtasks:
```
User: "What should I work on?"

AI:
1. Find parent tasks with incomplete subtasks
2. Suggest next logical subtask
3. Consider dependencies within subtasks
4. Response: "Start with 'Design wireframe' for the Build Dashboard task"
```

## Combining with Other Features

### Subtasks + Dependencies

- ✅ Subtasks can have dependencies on other tasks
- ✅ Parent task can have dependencies
- ✅ Subtasks within same parent can depend on each other

Example:
```
Parent: Build Feature
├─ Subtask A: Design
├─ Subtask B: Implement (depends on Subtask A)
└─ Subtask C: Test (depends on Subtask B)
```

### Subtasks + Recurring Tasks

- ✅ Recurring templates can generate tasks with subtasks
- Create template with subtasks predefined
- Each instance includes all subtasks

Example:
```
Recurring: Weekly Planning
├─ Review last week
├─ Set goals for this week
├─ Schedule key tasks
└─ Update priorities
```

### Subtasks + Time Tracking

- Estimate hours for each subtask
- Sum of subtask hours = parent task estimate
- Track time more granularly
- Better burndown charts

## Troubleshooting

### Subtask not showing

**Check**:
- Parent task is open in detail modal
- Subtask wasn't archived
- Refresh the task to reload

### Can't create nested subtasks

**By design**: Only 1 level of nesting allowed
- Subtasks can't have their own subtasks
- If you need more nesting, use separate parent tasks

### Progress not updating

**Solution**:
- Close and reopen task detail modal
- Check that subtasks actually changed status
- Ensure subtasks belong to correct parent

### Too many subtasks

**Problem**: Parent has 15+ subtasks, hard to manage

**Solution**:
1. Split parent into multiple tasks
2. Group related subtasks into separate parents
3. Use dependencies between the new parent tasks

## Tips

1. **Keep it simple**: 3-7 subtasks is ideal
2. **Descriptive titles**: Each subtask should be actionable
3. **Estimate time**: Add hours to subtasks for better planning
4. **Update frequently**: Check off subtasks as you complete them
5. **Use with AI**: Let AI break down complex tasks for you

## See Also

- [Dependencies Guide](./DEPENDENCIES_GUIDE.md) - For task relationships
- [Recurring Tasks Guide](./RECURRING_TASKS_GUIDE.md) - For repeated subtask patterns
- [MCP Integration](./MCP_QUICKSTART.md) - Full MCP command reference
