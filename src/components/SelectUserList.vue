<script setup lang="ts">
import { useObservable, from } from '@vueuse/rxjs'
import { message } from 'ant-design-vue'
import { liveQuery } from 'dexie'

import { db } from '@/database'
import { useStatusStore } from '@/stores'
import { getUserAvatar } from '@/utils'

const status = useStatusStore()

const userList = useObservable(
  from(
    liveQuery(async () => {
      return await db.users.toArray()
    })
  )
)

function specifyUser(type: 'bot' | 'persona', uid: number) {
  if (type === 'bot' && uid !== status.assignUser) {
    status.assignBot = uid
  } else if (type === 'persona' && uid !== status.assignBot) {
    status.assignUser = uid
  } else {
    message.error('身份与 Bot 不得为同一用户')
  }
}

const props = defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const visible = $computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  },
})
</script>

<template>
  <a-modal
    v-model:visible="visible"
    :wrap-style="{ overflow: 'hidden' }"
    :mask="false"
    :footer="null"
    width="20rem"
    :body-style="{ padding: 0 }"
    centered
    title="选择用户操作"
  >
    <div class="h-100 overflow-y-scroll px-4 py-2">
      <a-list class="demo-loadmore-list" item-layout="horizontal" :data-source="userList">
        <template #renderItem="{ item }">
          <a-list-item>
            <template #actions>
              <a key="list-loadmore-edit" @click="specifyUser('bot', item.id)">设为 Bot</a>
              <a key="list-loadmore-more" @click="specifyUser('persona', item.id)">设为身份</a>
            </template>
            <a-skeleton avatar :title="false" :loading="!!item.loading" active>
              <a-list-item-meta :description="`${item.name}(${item.id})`">
                <template #title>
                  <a href="https://www.antdv.com/">{{ item.name.last }}</a>
                </template>
                <template #avatar>
                  <a-avatar :src="getUserAvatar(item.id)" />
                </template>
              </a-list-item-meta>
            </a-skeleton>
          </a-list-item>
        </template>
      </a-list>
    </div>
  </a-modal>
</template>

<style scoped lang="postcss">
:deep(.ant-list-item-action) {
  @apply ml-0;
}
</style>
