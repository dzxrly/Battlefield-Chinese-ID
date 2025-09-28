<template>
  <q-page class="column justify-start items-center full-height full-width q-px-md q-pt-md">
    <div class="info-card full-width q-mb-md">
      <div class="info-header q-mb-md">
        <q-icon name="games" size="md" class="q-mr-sm" />
        <span class="text-h6 text-weight-bold">战地中文ID查询工具</span>
      </div>

      <div class="info-content">
        <div class="info-item" :class="isLtMd ? 'q-py-xs' : 'q-py-sm'">
          <q-icon name="info" color="primary" class="q-mr-sm" />
          <span
            >支持战地1 / 战地5 / 战地2042。每个游戏有独立哈希表；BF1 支持"简体输入→繁体检索"。</span
          >
        </div>

        <div class="info-item" :class="isLtMd ? 'q-py-xs' : 'q-py-sm'">
          <q-icon name="person" color="secondary" class="q-mr-sm" />
          <span>B站关注我&nbsp;</span>
          <a href="https://space.bilibili.com/35670010" target="_blank" class="custom-link">
            很大的小棒槌
          </a>
          <span>&nbsp;，BFV曾经CN TOP10， BF2042目前CN TOP10。</span>
        </div>

        <div class="info-item" :class="isLtMd ? 'q-py-xs' : 'q-py-sm'">
          <q-icon name="group" color="positive" class="q-mr-sm" />
          <span>一键加入&nbsp;</span>
          <a href="https://qm.qq.com/q/qh6htZCv3c" target="_blank" class="custom-link">
            战地开黑交流群
          </a>
        </div>
      </div>
    </div>

    <div class="controls-section full-width q-mb-md">
      <div class="item-header q-mb-md">
        <q-icon name="tune" class="q-mr-sm" />
        <span class="text-subtitle1 text-weight-medium">游戏选择</span>
      </div>

      <q-select
        class="game-selector q-mb-md"
        :class="{ 'col-xs-12 col-sm-12 col-md-6 col-lg-4 col-xl-3': true }"
        outlined
        v-model="selectedGame"
        :options="gameOptions"
        label="选择游戏"
        emit-value
        map-options
        color="primary"
        bg-color="white"
      >
        <template v-slot:prepend>
          <q-icon name="videogame_asset" color="primary" />
        </template>
      </q-select>

      <div class="item-header q-mb-md">
        <q-icon name="person" class="q-mr-sm" />
        <span class="text-subtitle1 text-weight-medium">昵称补充内容</span>
      </div>

      <div class="row justify-between items-center q-mb-md">
        <q-input
          :class="isLtMd ? 'col-12' : 'col-6 q-r-md'"
          v-model="playerNamePreffix"
          label="玩家昵称前缀"
          hint="至多8个字符"
          color="primary"
          bg-color="white"
          outlined
          clearable
          maxlength="8"
        >
          <template v-slot:prepend>
            <q-icon name="person" color="primary" />
          </template>
        </q-input>
        <q-input
          :class="isLtMd ? 'col-12 q-mt-md' : 'col-6 q-pl-md'"
          v-model="playerPlatoon"
          label="战排"
          :hint="`[${playerPlatoon ? playerPlatoon : '无'}]`"
          color="primary"
          bg-color="white"
          outlined
          clearable
          maxlength="4"
          :disable="selectedGame === 'bf2042'"
        >
          <template v-slot:prepend>
            <q-icon name="group" color="primary" />
          </template>
        </q-input>
      </div>

      <div class="item-header q-mb-md">
        <q-icon name="search" class="q-mr-sm" />
        <span class="text-subtitle1 text-weight-medium">搜索内容</span>
      </div>

      <q-input
        class="search-input q-mb-md"
        :class="{ 'col-xs-12 col-sm-12 col-md-6 col-lg-4 col-xl-3': true }"
        outlined
        v-model="searchQuery"
        label="输入HEX或文本关键词搜索"
        color="primary"
        bg-color="white"
        clearable
        debounce="300"
      >
        <template v-slot:prepend>
          <q-icon name="search" color="primary" />
        </template>
        <template v-slot:append>
          <q-chip
            v-if="filteredData.length !== originalData.length && searchQuery"
            :label="`找到 ${filteredData.length} 条结果`"
            color="positive"
            text-color="white"
            dense
            class="search-result-chip"
          />
        </template>
      </q-input>

      <q-table
        class="full-width custom-table"
        flat
        bordered
        :rows="filteredData"
        :columns="columns"
        row-key="hex"
        rows-per-page-label="每页行数"
        :rows-per-page-options="[10, 30, 50, 100]"
        color="primary"
        table-header-class="table-header"
        card-class="q-pa-none"
        separator="horizontal"
        :loading="loading"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <template v-slot:body-cell-select="props">
          <q-td :props="props" class="select-cell">
            <q-radio
              v-model="selectedRowKey"
              :val="props.row.hex"
              color="primary"
              @update:model-value="() => handleRowSelection(props.row)"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-hex="props">
          <q-td :props="props" class="hex-cell">
            <q-chip
              color="primary"
              text-color="white"
              :label="props.value.toUpperCase()"
              square
              dense
              class="hex-chip"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-text="props">
          <q-td :props="props" class="text-cell">
            <span v-html="highlightText(props.value, searchQuery)"></span>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width row flex-center q-gutter-sm text-grey">
            <q-icon size="2em" name="sentiment_dissatisfied" />
            <span class="text-subtitle1">
              {{ searchQuery ? '没有找到匹配的结果' : '暂无数据' }}
            </span>
          </div>
        </template>
      </q-table>

      <div class="selected-row-container full-width q-mt-md">
        <q-banner v-if="selectedRow" class="bg-grey-2 text-body1 selected-row-banner" dense>
          <div class="row items-center no-wrap">
            <q-icon name="check_circle" color="positive" class="q-mr-sm" />
            <span
              >已选中：<strong>{{ selectedRow.hex.toUpperCase() }}</strong> -
              {{ selectedRow.text }}</span
            >
          </div>
        </q-banner>
        <q-banner v-else class="bg-grey-2 text-body1 selected-row-banner" dense>
          <div class="row items-center no-wrap">
            <q-icon name="radio_button_unchecked" color="grey-6" class="q-mr-sm" />
            <span>当前未选中任何行</span>
          </div>
        </q-banner>
      </div>

      <div class="row justify-between items-center q-mt-md full-width">
        <q-select
          class="solution-count-selector"
          :class="isLtMd ? 'col-12 q-mt-md' : 'col-6 q-pr-md'"
          outlined
          v-model="maxSolutionCount"
          :options="solutionCountOptions"
          label="最多生成几组结果"
          emit-value
          map-options
          color="primary"
          bg-color="white"
          dense
        >
          <template v-slot:prepend>
            <q-icon name="layers" color="primary" />
          </template>
        </q-select>
        <div :class="isLtMd ? 'col-12 q-mt-md' : 'col-6 q-pl-md'">
          <q-btn
            class="full-width full-height"
            color="primary"
            label="计算"
            :disable="!selectedRow"
            :loading="calculating"
            unelevated
            @click="handleCalculate"
          >
            <template v-slot:loading>
              <q-spinner-gears scolor="primary" class="q-mr-sm" />
              <span>计算中...</span>
            </template>
          </q-btn>
        </div>
      </div>

      <div class="full-width">
        <div v-if="calculationResults.length" class="q-mt-lg calc-result">
          <div class="text-body2 text-grey-7 q-mb-sm">
            共找到 <strong>{{ calculationResults.length }}</strong> 组结果
            <span v-if="totalIterations"
              >，累计迭代 <strong>{{ totalIterations }}</strong> 次</span
            >
            <span v-if="formattedTotalDuration"
              >，耗时 <strong>{{ formattedTotalDuration }}</strong></span
            >
          </div>
          <q-list bordered class="calc-result-list">
            <q-item
              v-for="result in calculationResults"
              :key="result.id"
              class="calc-result-item row justify-start items-center q-py-sm"
            >
              <q-btn
                flat
                rounded
                color="primary"
                icon="content_copy"
                @click="() => handleCopyResult(result)"
              >
                <q-tooltip anchor="bottom middle" self="top middle">复制到剪贴板</q-tooltip>
              </q-btn>
              <div class="column justify-start items-start q-ml-md">
                <span>{{ result.id }}</span>
                <span class="result-iteration">迭代次数：{{ result.iterations }}</span>
              </div>
            </q-item>
          </q-list>
        </div>
        <div v-else-if="calculationError" class="q-mt-sm calc-result">
          <q-banner class="bg-red-1 text-negative calc-result-banner" dense>
            <div class="column">
              <span>{{ calculationError }}</span>
            </div>
          </q-banner>
        </div>
      </div>
      <div class="q-mt-md">
        <q-expansion-item label="高级选项" color="primary" dense expand-separator>
          <q-card>
            <q-card-section>
              <div class="column justify-start items-center full-width">
                <div class="row justify-between items-center full-width">
                  <span class="text-body1">单个解的最大迭代次数</span>
                  <q-input v-model.number="maxIterations" min="1" color="primary" outlined dense>
                    <template v-slot:prepend>
                      <q-btn
                        flat
                        rounded
                        dense
                        icon="remove"
                        @click="
                          () => {
                            if (maxIterations > 1) {
                              maxIterations--;
                            }
                          }
                        "
                      />
                    </template>
                    <template v-slot:append>
                      <q-btn flat rounded dense icon="add" @click="maxIterations++" />
                    </template>
                  </q-input>
                </div>
                <div class="row justify-start items-center full-width">
                  <span class="text-grey-8 text-caption"
                    >警告：最大迭代次数过高可能会导致计算时间过长，请谨慎设置。</span
                  >
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { sify, tify } from 'chinese-conv';
import type { QTableColumn } from 'quasar';
import { copyToClipboard, Notify, useQuasar } from 'quasar';
import { computed, ref, watch } from 'vue';
import {
  BattlefieldIdError,
  calculateBattlefieldId,
  type CalculationResult,
} from 'src/utils/battlefield-id-calculator';

type DataRow = {
  hex: string;
  text: string;
  textSimplified: string;
};

// hooks
const $q = useQuasar();

// state
const selectedGame = ref('bf1');
const originalData = ref<DataRow[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const playerNamePreffix = ref('');
const playerPlatoon = ref('');
const selectedRowKey = ref<string | null>(null);
const selectedRow = ref<DataRow | null>(null);
const calculating = ref(false);
const calculationResults = ref<CalculationResult[]>([]);
const calculationError = ref<string | null>(null);
const maxSolutionCount = ref(5);
const maxIterations = ref(20);
const calculationStartTime = ref<number | null>(null);
const calculationDuration = ref<number | null>(null);

// constants & computed
const solutionCountOptions = [
  { label: '5 组', value: 5 },
  { label: '10 组', value: 10 },
  { label: '20 组', value: 20 },
  { label: '50 组', value: 50 },
];

const gameOptions = [
  { label: '战地1', value: 'bf1' },
  { label: '战地5', value: 'bfv' },
  { label: '战地2042', value: 'bf2042' },
];

const columns = computed<QTableColumn<DataRow>[]>(() => [
  {
    name: 'select',
    required: false,
    label: '选择',
    sortable: false,
    field: (row: DataRow) => row.hex,
    align: 'left',
    style: 'width: 70px',
    headerStyle: 'font-weight: bold; color: white; width: 70px;',
  },
  {
    name: 'hex',
    required: true,
    label: 'HEX',
    sortable: false,
    field: (row: DataRow) => row.hex,
    format: (val: string) => val.toUpperCase(),
    align: 'left',
    style: 'width: 200px',
    headerStyle: 'font-weight: bold; color: white;',
  },
  {
    name: 'text',
    required: true,
    label: '文本',
    sortable: false,
    field: (row: DataRow) => row.text,
    format: (val: string) => val,
    headerStyle: 'font-weight: bold; color: white;',
    align: 'left',
  },
]);

const isLtMd = computed(() => $q.screen.lt.md);

const filteredData = computed(() => {
  const rawQuery = (searchQuery.value ?? '').trim();
  if (!rawQuery) {
    return originalData.value;
  }

  const lowerQuery = rawQuery.toLowerCase();
  const queryTraditional = tify(lowerQuery);
  const querySimplified = sify(lowerQuery);

  return originalData.value.filter((item) => {
    const hexLower = item.hex.toLowerCase();
    const textTraditionalLower = item.text.toLowerCase();
    const textSimplifiedLower = item.textSimplified.toLowerCase();

    return (
      hexLower.includes(lowerQuery) ||
      textTraditionalLower.includes(lowerQuery) ||
      textTraditionalLower.includes(queryTraditional) ||
      textSimplifiedLower.includes(lowerQuery) ||
      textSimplifiedLower.includes(querySimplified)
    );
  });
});

const totalIterations = computed(() => {
  return calculationResults.value.reduce((sum, item) => sum + item.iterations, 0);
});

const formattedTotalDuration = computed(() => {
  if (calculationDuration.value === null) {
    return null;
  }
  const seconds = calculationDuration.value / 1000;
  if (seconds < 1) {
    return `${calculationDuration.value} 毫秒`;
  }
  return `${seconds.toFixed(2)} 秒`;
});

// functions
function highlightText(text: string, query: string | null | undefined): string {
  const rawQuery = (query ?? '').trim();
  if (!rawQuery) {
    return text;
  }

  const variants = Array.from(new Set([rawQuery, tify(rawQuery), sify(rawQuery)].filter(Boolean)));

  const regex = new RegExp(
    `(${variants.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  return text.replace(regex, '<mark class="highlight">$1</mark>');
}

function handleRowSelection(row: DataRow) {
  selectedRowKey.value = row.hex;
  selectedRow.value = row;
  calculationResults.value = [];
  calculationError.value = null;
  calculationStartTime.value = null;
  calculationDuration.value = null;
}

function loadData(game: string) {
  loading.value = true;
  searchQuery.value = '';
  selectedRowKey.value = null;
  selectedRow.value = null;
  calculationResults.value = [];
  calculationError.value = null;
  calculationStartTime.value = null;
  calculationDuration.value = null;

  new Promise((resolve, reject) => {
    if (game === 'bf1') {
      console.log('加载战地1数据');
      import('assets/data/bf1.json')
        .then((module) => resolve(module.default))
        .catch(() => reject(new Error('加载数据失败，请稍后重试')));
    } else if (game === 'bfv') {
      console.log('加载战地5数据');
      import('assets/data/bf5.json')
        .then((module) => resolve(module.default))
        .catch(() => reject(new Error('加载数据失败，请稍后重试')));
    } else if (game === 'bf2042') {
      console.log('加载战地2042数据');
      import('assets/data/bf2042.json')
        .then((module) => resolve(module.default))
        .catch(() => reject(new Error('加载数据失败，请稍后重试')));
    } else {
      reject(new Error('未知游戏'));
    }
  })
    .then(
      (result) => {
        originalData.value = (result as { hex: string; text: string }[]).map((item) => ({
          ...item,
          textSimplified: sify(item.text),
        }));
        console.log(originalData.value);
      },
      (error) => {
        Notify.create({
          type: 'negative',
          message: (error as Error).message,
        });
      },
    )
    .finally(() => {
      loading.value = false;
    });
}

async function handleCopyResult(result: CalculationResult) {
  try {
    await copyToClipboard(result.id);
    Notify.create({ type: 'positive', message: '已复制生成ID' });
  } catch (error) {
    console.error(error);
    Notify.create({ type: 'negative', message: '复制失败，请手动复制' });
  }
}

async function handleCalculate() {
  if (!selectedRow.value) {
    return;
  }

  calculating.value = true;
  calculationResults.value = [];
  calculationError.value = null;
  calculationStartTime.value = Date.now();
  calculationDuration.value = null;

  const init = (playerNamePreffix.value ?? '').trim();
  const clanRaw = selectedGame.value === 'bf2042' ? '' : (playerPlatoon.value ?? '').trim();
  const clan = clanRaw ? clanRaw : undefined;

  try {
    const results = await calculateBattlefieldId(init, selectedRow.value.hex, clan, {
      maxSolutions: maxSolutionCount.value,
      maxIterations: maxIterations.value,
    });
    calculationResults.value = results;
    if (calculationStartTime.value !== null) {
      calculationDuration.value = Date.now() - calculationStartTime.value;
    }
  } catch (error) {
    let message = '计算失败，请稍后重试';
    if (error instanceof BattlefieldIdError) {
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    calculationError.value = message;
    Notify.create({ type: 'negative', message });
  } finally {
    calculating.value = false;
    calculationStartTime.value = null;
  }
}

// init
loadData(selectedGame.value);

// watchers
watch(selectedGame, (newGame) => {
  loadData(newGame);
  if (newGame === 'bf2042') {
    playerPlatoon.value = '';
  }
});

watch(filteredData, (rows) => {
  if (selectedRowKey.value && !rows.some((row) => row.hex === selectedRowKey.value)) {
    selectedRowKey.value = null;
    selectedRow.value = null;
    calculationResults.value = [];
    calculationError.value = null;
    calculationStartTime.value = null;
    calculationDuration.value = null;
  }
});

watch([playerNamePreffix, playerPlatoon], () => {
  calculationResults.value = [];
  calculationError.value = null;
  calculationStartTime.value = null;
  calculationDuration.value = null;
});

watch(maxSolutionCount, () => {
  calculationResults.value = [];
  calculationError.value = null;
  calculationStartTime.value = null;
  calculationDuration.value = null;
});
</script>

<style lang="scss" scoped>
// Quasar 主题颜色变量
$primary: var(--q-primary);
$secondary: var(--q-secondary);
$positive: var(--q-positive);
$negative: var(--q-negative);
$warning: var(--q-warning);
$info: var(--q-info);

// 自定义变量
$border-radius: 12px;
$border-radius-small: 8px;
$shadow-light: 0 2px 8px rgba(0, 0, 0, 0.06);
$shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.08);
$border-color: rgba(0, 0, 0, 0.05);
$primary-hover: rgba(25, 118, 210, 0.08);
$primary-light: rgba(25, 118, 210, 0.05);

.info-card {
  background: white;
  border-radius: $border-radius;
  padding: 24px;
  box-shadow: $shadow-medium;
  border: 1px solid $border-color;

  .info-header {
    display: flex;
    align-items: center;
    color: $primary;
    padding-bottom: 16px;
    border-bottom: 2px solid #e3f2fd;
  }

  .info-content {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .info-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-radius: 6px;
      transition: background-color 0.2s;
    }
  }
}

.custom-link {
  color: $primary;
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background-color: $primary-hover;
    transform: translateY(-1px);
  }
}

.controls-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: white;
  border-radius: $border-radius;
  padding: 20px;
  box-shadow: $shadow-light;
  border: 1px solid $border-color;
  min-width: 300px;

  .item-header {
    display: flex;
    align-items: center;
    color: #424242;
  }

  .game-selector,
  .search-input {
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
    }
  }

  .search-result-chip {
    font-size: 11px;
    height: 20px;
  }
}

.custom-table {
  box-shadow: none;
  border-radius: $border-radius-small;
  overflow: hidden;
  border: 1px solid #e0e0e0;

  .hex-cell {
    padding: 8px 16px;

    .hex-chip {
      transition: all 0.2s;
      cursor: pointer;
    }
  }

  .text-cell {
    padding: 8px 16px;
    font-weight: 500;
  }
}

.select-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.calc-result-banner {
  border-radius: 8px;
  box-shadow: $shadow-light;
  padding: 12px 16px;
}

.selected-row-container {
  .selected-row-banner {
    border-radius: 8px;
    box-shadow: $shadow-light;
    padding: 12px 16px;
  }
}

.calc-result-list {
  border-radius: $border-radius-small;
  border: 1px solid #e0e0e0;
  background: white;

  .calc-result-item {
    .result-id {
      font-size: 15px;
      letter-spacing: 0.3px;
      font-weight: 600;
    }

    .result-iteration {
      color: #78909c;
    }

    .q-btn {
      min-width: 0;
    }
  }
}

.calc-result-summary {
  display: none;
}

// 深度选择器分离出来，避免嵌套语法错误
:deep(.table-header) {
  background: linear-gradient(45deg, #{$primary}, #42a5f5);
  color: white;
  font-weight: bold;
}

:deep(.q-table tbody tr:hover) {
  background-color: $primary-light;
  transition: all 0.2s;
}

:deep(.q-table tbody tr:nth-child(even)) {
  background-color: rgba(0, 0, 0, 0.02);
}

:deep(.q-table th) {
  font-size: 14px;
  letter-spacing: 1px;
}

:deep(.q-table td) {
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.q-table__bottom) {
  background-color: #fafafa;
  border-top: 1px solid #e0e0e0;
}

:deep(.highlight) {
  background-color: #ffeb3b;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;
}

// 响应式媒体查询
@media (max-width: 600px) {
  .info-card {
    padding: 16px;
  }

  .controls-section {
    padding: 16px;
    min-width: unset;
  }
}

.relative-position {
  position: relative;

  :deep(.q-inner-loading) {
    backdrop-filter: blur(4px);
    background-color: rgba(255, 255, 255, 0.65);
  }
}
</style>
