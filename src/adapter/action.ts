import type { Scenes } from './scene'
import type { StrKeyObject } from './typed'

export interface ActionRequest {
  action: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
  echo?: string
}

export interface ActionResponse<D extends StrKeyObject = StrKeyObject> {
  status: 'ok' | 'failed'
  retcode: number
  data: D | null
  echo?: string
}

export interface ActionResult<R extends StrKeyObject = StrKeyObject, S extends Scenes = Scenes> {
  response: ActionResponse<R>
  scene?: S
}

export interface ActionStrategy {
  [key: string]: (request: ActionRequest['params']) => ActionResult | Promise<ActionResult>
}

export abstract class AdapterActionHandler {
  abstract readonly strategy: ActionStrategy

  abstract handle(request: ActionRequest): Promise<ActionResult>
}
