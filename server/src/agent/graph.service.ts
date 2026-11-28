import { Injectable } from '@nestjs/common';
import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
  interrupt,
  START,
} from '@langchain/langgraph';
import { toolsCondition } from '@langchain/langgraph/prebuilt';
import { AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';

/** Tools that require explicit user confirmation before execution. */
export const DESTRUCTIVE_TOOLS = new Set(['delete_song']);

/** Shape of the value passed to interrupt() — surfaced to the client. */
export interface InterruptValue {
  tool: string;
  args: Record<string, unknown>;
}

@Injectable()
export class GraphService {
  /** Single MemorySaver shared across all users — keyed by thread_id. */
  private readonly checkpointer = new MemorySaver();

  /**
   * Compiles a ReAct-style LangGraph with:
   *   agent → (toolsCondition) → tools → agent → ...
   *
   * Destructive tools are intercepted in the tools node with interrupt(),
   * pausing the graph and awaiting boolean confirmation from the client.
   */
  build(llm: ChatOpenAI, tools: DynamicStructuredTool[], systemPrompt: string) {
    const toolsMap = new Map(tools.map(t => [t.name, t]));
    const llmWithTools = llm.bindTools(tools);

    // ── Agent node — LLM decides what to do next ─────────────────────────────
    const agentNode = async (state: typeof MessagesAnnotation.State) => {
      const response = await llmWithTools.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages,
      ]);
      return { messages: [response] };
    };

    // ── Tools node — executes tool calls; interrupts on destructive ones ──────
    const toolsNode = async (state: typeof MessagesAnnotation.State) => {
      const lastMessage = state.messages.at(-1) as AIMessage;
      const toolCalls = lastMessage.tool_calls ?? [];
      const results: ToolMessage[] = [];

      for (const call of toolCalls) {
        // Destructive tool — pause the graph and wait for confirmation
        if (DESTRUCTIVE_TOOLS.has(call.name)) {
          const confirmed = interrupt<InterruptValue, boolean>({
            tool: call.name,
            args: call.args as Record<string, unknown>,
          });

          if (!confirmed) {
            results.push(
              new ToolMessage({
                tool_call_id: call.id!,
                content: 'Action cancelled by user.',
              }),
            );
            continue;
          }
        }

        // Execute the tool
        const tool = toolsMap.get(call.name);
        if (!tool) {
          results.push(
            new ToolMessage({
              tool_call_id: call.id!,
              content: `Unknown tool: ${call.name}`,
            }),
          );
          continue;
        }

        try {
          const output = await tool.invoke(call.args as Record<string, unknown>);
          results.push(
            new ToolMessage({
              tool_call_id: call.id!,
              content: typeof output === 'string' ? output : JSON.stringify(output),
            }),
          );
        } catch (err) {
          results.push(
            new ToolMessage({
              tool_call_id: call.id!,
              content: `Tool error: ${(err as Error).message}`,
            }),
          );
        }
      }

      return { messages: results };
    };

    // ── Compile graph ─────────────────────────────────────────────────────────
    return new StateGraph(MessagesAnnotation)
      .addNode('agent', agentNode)
      .addNode('tools', toolsNode)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', toolsCondition) // → 'tools' or END
      .addEdge('tools', 'agent')
      .compile({ checkpointer: this.checkpointer });
  }
}
