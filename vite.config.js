import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'og-image-v2.png'], // 캐시할 파일들
      manifest: {
        name: 'K-Food Tracker: 독일 한인마트 가격비교',
        short_name: 'K-Food Tracker',
        description: '독일 내 주요 한인마트의 실시간 최저가를 확인하세요.',
        theme_color: '#4f46e5', // 앱 상단 바 색상 (인디고)
        background_color: '#ffffff',
        display: 'standalone', // 앱처럼 보이게 설정
        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // 안드로이드 아이콘 최적화
          }
        ]
      }
    })
  ]
})