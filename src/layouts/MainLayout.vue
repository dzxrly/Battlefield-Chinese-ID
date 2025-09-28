<template>
  <q-layout view="hHh lpR fff">
    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="bg-transparent text-grey-14">
      <div class="column justify-center items-center full-width">
        <div class="row justify-center items-center full-width text-subtitle2">
          <span>由&nbsp;</span>
          <a class="custom-link" href="https://github.com/jo4rchy" target="_blank"> jo4rchy </a>
          <span>&nbsp;协助ChatGPT制作。项目开源，欢迎在&nbsp;</span>
          <a
            class="custom-link"
            href="https://github.com/jo4rchy/Battlefield-Chinese-ID"
            target="_blank"
          >
            Github Repo
          </a>
          <span>&nbsp;上贡献代码。</span>
          <a class="custom-link" href="https://eggtargaryen.com" target="_blank"> EggTargaryen </a>
          <span>&nbsp;重构代码采用纯前端计算结果，无需后端部署。</span>
        </div>
        <div class="row justify-center items-center full-width text-subtitle2">
          <span>关注&nbsp;</span>
          <a class="custom-link" href="https://space.bilibili.com/35670010" target="_blank">
            我的Bilibili
          </a>
          <span>&nbsp;，战地风云超级老登。</span>
        </div>
      </div>
    </q-footer>
  </q-layout>
</template>

<style scoped lang="scss">
$primary: var(--q-primary);
$primary-hover: rgba(25, 118, 210, 0.08);

.header-row {
  background: rgba(255, 255, 255, 1);
  @supports (backdrop-filter: blur(7px)) or (-webkit-backdrop-filter: blur(7px)) {
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(7px);
    -webkit-backdrop-filter: blur(7px);
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
</style>
<script setup lang="ts"></script>
