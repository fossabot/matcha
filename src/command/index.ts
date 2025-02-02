import { invoke } from '@tauri-apps/api/tauri'

import { useChatStore } from '@/stores'
import { asyncWrapper } from '@/utils'

import type { Contents, TextContent } from '@/adapter/content'

const chat = useChatStore()

/** 检查是否使用了 MatchaCommand */
export function checkMatchaCommand(contents: Contents[]): boolean {
  if (contents.length === 1 && contents[0].type === 'text') {
    const text = (contents[0] as TextContent).data.text.toLowerCase()
    if (text.startsWith('matcha:>')) {
      return true
    }
  }
  return false
}

export async function runMatchaCommand(
  chatType: 'private' | 'group',
  chatId: number | string,
  contents: Contents[]
): Promise<void> {
  const command = extractCommand(contents)
  const commandFn = commandStrategy[command]
  if (commandFn) {
    const asyncFn = asyncWrapper(commandFn)
    await asyncFn(chatType, chatId)
  }
}

function extractCommand(contents: Contents[]): string {
  const text = (contents[0] as TextContent).data.text
  return text.replace(/^matcha:>/i, '').trim()
}

interface CommandStrategy {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: ((...param: any) => void | Promise<void>) | undefined
}

const commandStrategy: CommandStrategy = {
  'devtools': openDevtools,
  'clear': clearChats,
  'clearAll': clearAllChats,
}

async function openDevtools(): Promise<void> {
  await invoke('open_devtools')
}

function clearChats(chatType: 'private' | 'group', chatId: number | string): void {
  chat.getChats(chatType, chatId).length = 0
}

function clearAllChats(): void {
  chat.privateChats.clear()
  chat.groupChats.clear()
}
