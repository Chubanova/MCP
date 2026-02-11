#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import fs from "fs";
import { exec } from "child_process";
import path from "path";

// Загрузка переменных окружения
dotenv.config();

// Создание MCP сервера
const server = new McpServer({
  name: "simple-mcp-server",
  version: "1.0.0"
});

// Логирование вызовов инструментов
function logToolCall(toolName, params) {
  console.error(`[MCP] Вызов инструмента: ${toolName}`);
  console.error(`[MCP] Параметры: ${JSON.stringify(params, null, 2)}`);
}

function logToolResult(toolName, result, isError = false) {
  const status = isError ? "Ошибка" : "Успех";
  console.error(`[MCP] Результат инструмента ${toolName}: ${status}`);
  if (isError) {
    console.error(`[MCP] Ошибка: ${JSON.stringify(result, null, 2)}`);
  }
}

// Инструмент 1: Doc/Code context tool
server.tool(
  "get_documentation",
  {
    query: z.string().describe("Запрос для поиска документации (package/class/function)"),
    source: z.string().optional().describe("Источник документации (по умолчанию: local)")
  },
  async ({ query, source = "local" }) => {
    logToolCall("get_documentation", { query, source });
    
    try {
      // В реальной реализации здесь будет логика поиска документации
      // В данном примере возвращаем заглушку
      const result = {
        content: [
          {
            type: "text",
            text: `Документация для "${query}":\n\n` +
                  `Это пример документации для ${query}.\n` +
                  `В реальной реализации здесь будет содержимое из локальных источников.\n` +
                  `Источник: ${source}`
          }
        ]
      };
      
      logToolResult("get_documentation", result);
      return result;
    } catch (error) {
      const errorResult = {
        content: [
          {
            type: "text",
            text: `Ошибка при получении документации: ${error.message}`
          }
        ],
        isError: true
      };
      
      logToolResult("get_documentation", errorResult, true);
      return errorResult;
    }
  }
);

// Инструмент 2: Project helper tool
server.tool(
  "search_project",
  {
    query: z.string().describe("Поисковый запрос"),
    filePattern: z.string().optional().describe("Паттерн файлов для поиска (например, *.js, *.ts)")
  },
  async ({ query, filePattern = "*" }) => {
    logToolCall("search_project", { query, filePattern });
    
    try {
      // В реальной реализации здесь будет логика поиска по файлам проекта
      // В данном примере возвращаем заглушку
      const result = {
        content: [
          {
            type: "text",
            text: `Результаты поиска для "${query}" в файлах ${filePattern}:\n\n` +
                  `1. src/index.js:15 - // Пример использования ${query}\n` +
                  `2. src/utils.js:8 - function ${query}() { ... }\n` +
                  `3. tests/${query}.test.js:22 - test('${query} functionality', () => { ... })`
          }
        ]
      };
      
      logToolResult("search_project", result);
      return result;
    } catch (error) {
      const errorResult = {
        content: [
          {
            type: "text",
            text: `Ошибка при поиске в проекте: ${error.message}`
          }
        ],
        isError: true
      };
      
      logToolResult("search_project", errorResult, true);
      return errorResult;
    }
  }
);

// Инструмент 3: DevOps/tooling tool
server.tool(
  "run_command",
  {
    command: z.string().describe("Команда для выполнения"),
    args: z.array(z.string()).optional().describe("Аргументы команды")
  },
  async ({ command, args = [] }) => {
    logToolCall("run_command", { command, args });
    
    try {
      // Проверка разрешенных команд из .env
      const allowedCommands = process.env.ALLOWED_COMMANDS?.split(",") || [];
      const fullCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;
      
      if (!allowedCommands.includes(fullCommand)) {
        const errorResult = {
          content: [
            {
              type: "text",
              text: `Команда "${fullCommand}" не разрешена. Разрешенные команды: ${allowedCommands.join(", ")}`
            }
          ],
          isError: true
        };
        
        logToolResult("run_command", errorResult, true);
        return errorResult;
      }
      
      // Выполнение команды
      const result = await new Promise((resolve, reject) => {
        exec(fullCommand, { cwd: process.env.PROJECT_PATH || "." }, (error, stdout, stderr) => {
          if (error) {
            reject({ error: error.message, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        });
      });
      
      const successResult = {
        content: [
          {
            type: "text",
            text: `Результат выполнения команды "${fullCommand}":\n\n` +
                  `STDOUT:\n${result.stdout}\n\n` +
                  `STDERR:\n${result.stderr}`
          }
        ]
      };
      
      logToolResult("run_command", successResult);
      return successResult;
    } catch (error) {
      const errorResult = {
        content: [
          {
            type: "text",
            text: `Ошибка при выполнении команды: ${JSON.stringify(error, null, 2)}`
          }
        ],
        isError: true
      };
      
      logToolResult("run_command", errorResult, true);
      return errorResult;
    }
  }
);

// Запуск сервера
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP сервер запущен и готов к работе');
  } catch (error) {
    console.error('Ошибка запуска MCP сервера:', error);
    process.exit(1);
  }
}

startServer();