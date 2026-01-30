import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/ai/prioritize - Get AI suggestions for task prioritization and estimation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task_ids, project_id } = body

    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return NextResponse.json(
        { error: 'task_ids array is required' },
        { status: 400 }
      )
    }

    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: task_ids },
        ...(project_id && { project_id }),
      },
      include: {
        project: true,
        dependencies: {
          include: {
            depends_on_task: true,
          },
        },
        blocking_tasks: {
          include: {
            task: true,
          },
        },
      },
    })

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks found' },
        { status: 404 }
      )
    }

    // Prepare task data for AI
    const taskData = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      current_priority: task.priority,
      current_status: task.status,
      estimated_hours: task.estimated_hours,
      due_date: task.due_date,
      has_dependencies: task.dependencies.length > 0,
      is_blocked: task.blocking_tasks.length > 0,
      project_name: task.project?.name || '',
    }))

    // Get LLM provider from environment (default to OpenAI-compatible)
    const llmProvider = process.env.LLM_PROVIDER || 'openai'
    const llmApiKey = process.env.LLM_API_KEY
    const llmApiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'

    if (!llmApiKey && llmProvider === 'openai') {
      return NextResponse.json(
        { 
          error: 'LLM API key not configured',
          message: 'Set LLM_API_KEY environment variable to use AI prioritization'
        },
        { status: 500 }
      )
    }

    // Build prompt for AI
    const prompt = `You are a project management assistant helping prioritize and estimate tasks.

Given the following tasks, provide:
1. Story point estimates (using Fibonacci: 1, 2, 3, 5, 8, 13, 21)
2. Priority ordering (high, medium, low)
3. Recommended sprint assignment order

Tasks:
${taskData.map((t, i) => `
${i + 1}. ${t.title}
   Description: ${t.description || 'No description'}
   Current Priority: ${t.current_priority}
   Current Status: ${t.current_status}
   Estimated Hours: ${t.estimated_hours || 'Not set'}
   Due Date: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'Not set'}
   Has Dependencies: ${t.has_dependencies ? 'Yes' : 'No'}
   Is Blocked: ${t.is_blocked ? 'Yes' : 'No'}
`).join('\n')}

Return a JSON array with this structure:
[
  {
    "task_id": "task-id-here",
    "suggested_story_points": 5,
    "suggested_priority": "high",
    "recommended_order": 1,
    "reasoning": "Brief explanation"
  }
]

Order tasks by:
1. Dependencies (tasks with dependencies should come after their dependencies)
2. Priority (high > medium > low)
3. Due dates (earlier due dates first)
4. Blocked status (unblocked tasks first)`

    // Call LLM
    let suggestions
    try {
      if (llmProvider === 'openai' || llmProvider === 'anthropic') {
        const response = await fetch(llmApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(llmProvider === 'openai' && { 'Authorization': `Bearer ${llmApiKey}` }),
            ...(llmProvider === 'anthropic' && { 'x-api-key': llmApiKey || '', 'anthropic-version': '2023-06-01' }),
          },
          body: JSON.stringify({
            model: process.env.LLM_MODEL || (llmProvider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229'),
            messages: [
              {
                role: 'system',
                content: 'You are a helpful project management assistant. Always return valid JSON arrays.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        })

        if (!response.ok) {
          throw new Error(`LLM API error: ${response.statusText}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || data.content || '{}'
        
        // Parse JSON response
        let parsed
        try {
          parsed = JSON.parse(content)
        } catch {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1])
          } else {
            // Try parsing as direct JSON
            parsed = JSON.parse(content)
          }
        }

        // Handle both { suggestions: [...] } and direct array formats
        suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || parsed.tasks || [])
      } else {
        // Fallback: Simple heuristic-based prioritization
        suggestions = taskData.map((task, index) => ({
          task_id: task.id,
          suggested_story_points: task.estimated_hours 
            ? Math.max(1, Math.ceil(task.estimated_hours / 4)) // Rough conversion: 4 hours = 1 story point
            : 3, // Default to 3 if no estimate
          suggested_priority: task.current_priority || 'medium',
          recommended_order: index + 1,
          reasoning: `Based on current priority: ${task.current_priority}`,
        }))
      }
    } catch (error: any) {
      console.error('Error calling LLM:', error)
      
      // Fallback to heuristic-based prioritization
      suggestions = taskData.map((task, index) => {
        // Calculate priority based on multiple factors
        let priorityScore = 0
        if (task.current_priority === 'high') priorityScore += 3
        else if (task.current_priority === 'medium') priorityScore += 2
        else priorityScore += 1

        if (task.due_date) {
          const daysUntilDue = Math.ceil(
            (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          if (daysUntilDue < 7) priorityScore += 2
          else if (daysUntilDue < 14) priorityScore += 1
        }

        if (task.is_blocked) priorityScore -= 1
        if (task.has_dependencies) priorityScore += 0.5

        const suggestedPriority = priorityScore >= 3 ? 'high' : priorityScore >= 2 ? 'medium' : 'low'

        return {
          task_id: task.id,
          suggested_story_points: task.estimated_hours 
            ? Math.max(1, Math.ceil(task.estimated_hours / 4))
            : 3,
          suggested_priority: suggestedPriority,
          recommended_order: index + 1,
          reasoning: `Heuristic-based: ${task.current_priority} priority, ${task.due_date ? 'has due date' : 'no due date'}, ${task.is_blocked ? 'blocked' : 'unblocked'}`,
        }
      })

      // Sort by recommended order
      suggestions.sort((a, b) => {
        // Higher priority first
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.suggested_priority as keyof typeof priorityOrder] - 
                            priorityOrder[a.suggested_priority as keyof typeof priorityOrder]
        if (priorityDiff !== 0) return priorityDiff
        return a.recommended_order - b.recommended_order
      })

      // Reassign order after sorting
      suggestions = suggestions.map((s, i) => ({ ...s, recommended_order: i + 1 }))
    }

    // Validate and format response
    const formattedSuggestions = suggestions.map((s: any) => ({
      task_id: s.task_id,
      suggested_story_points: Math.max(1, Math.min(21, s.suggested_story_points || 3)),
      suggested_priority: ['high', 'medium', 'low'].includes(s.suggested_priority) 
        ? s.suggested_priority 
        : 'medium',
      recommended_order: s.recommended_order || 0,
      reasoning: s.reasoning || 'No reasoning provided',
    }))

    return NextResponse.json({
      suggestions: formattedSuggestions,
      total_tasks: tasks.length,
    })
  } catch (error: any) {
    console.error('Error in AI prioritize:', error)
    return NextResponse.json(
      { error: 'Failed to get AI prioritization', details: error.message },
      { status: 500 }
    )
  }
}
