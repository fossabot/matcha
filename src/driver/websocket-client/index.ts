import { decode } from '@msgpack/msgpack'

import { Adapter } from '@/adapter/adapter'
import { logger } from '@/plugins'
import WebSocket from '@/plugins/websocket'
import { getUUID } from '@/utils'

import { Driver } from '../driver'

import type { ActionRequest } from '@/adapter/action'
import type { Event } from '@/adapter/event'
import type { Message, ConnectionConfig } from '@/plugins/websocket'

export class websocketClient implements Driver {
  ws: WebSocket | null = null
  static id = ''

  constructor(public adapter: Adapter) {}

  async run(): Promise<void> {
    await this.connect()
  }

  async stop(): Promise<void> {
    await this.disconnect()
  }

  async send(event: Event): Promise<boolean> {
    if (!this.ws) {
      return false
    }
    try {
      await this.ws.send({ type: 'Text', data: JSON.stringify(event) })
      return true
    } catch (error) {
      return false
    }
  }

  async connect(): Promise<void> {
    websocketClient.id = getUUID()
    const connectID = websocketClient.id
    const connectUrl = this.adapter.getConnectUrl()
    const connectConfig = await this.getConnectConfig()
    const autoConnect = async () => {
      if (connectID !== websocketClient.id) {
        return
      }
      try {
        logger.info(`正在尝试连接到反向 WebSocket 服务器 ${connectUrl}`)
        const wsId = sessionStorage.getItem('ws_id')
        if (wsId) {
          this.ws = new WebSocket(Number(wsId), [])
          await this.disconnect()
        }
        this.ws = await WebSocket.connect(connectUrl, connectConfig)
        sessionStorage.setItem('ws_id', this.ws.id.toString())
        this.ws.addListener(async (message: Message) => {
          switch (message.type) {
            case 'Text':
            case 'Binary': {
              const data: ActionRequest = message.type === 'Text' ? JSON.parse(message.data) : decode(message.data)
              const result = { ...(await this.adapter.actionHandle(data)), echo: data.echo }
              await this.ws?.send({ type: 'Text', data: JSON.stringify(result) })
              break
            }
            case 'Ping':
            case 'Pong':
              break
            default:
              await autoConnect()
          }
        })
        logger.info(`已连接到反向 WebSocket 服务器 ${connectUrl}`)
      } catch (error) {
        logger.error(`[WebSocket] 连接到反向 WebSocket 服务器 ${connectUrl} 时出现错误: ${error}`)
        if (this.adapter.config.reconnectInterval) {
          setTimeout(autoConnect, this.adapter.config.reconnectInterval * 1000)
        }
      }
    }
    await autoConnect()
  }

  async disconnect(): Promise<void> {
    sessionStorage.removeItem('ws_id')
    await this.ws?.disconnect()
    this.ws = null
    websocketClient.id = ''
  }

  async getConnectConfig(): Promise<ConnectionConfig> {
    const connectConfig = { extraHeaders: await this.adapter.getConnectHeaders() }
    if (this.adapter.config.accessToken !== null) {
      connectConfig.extraHeaders.Authorization = 'Bearer' + this.adapter.config.accessToken
    }
    return connectConfig
  }
}
