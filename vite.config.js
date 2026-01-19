import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'og-image-v2.png', 'og-image-512.png'],
      manifest: {
        name: 'K-Food Tracker: 독일 한인마트 가격비교',
        short_name: 'K-Food Tracker v2',
        description: '독일 내 주요 한인마트의 실시간 최저가를 확인하세요.',
        theme_color: '#4f46e5', // 앱 상단 바 색상 (인디고)
        background_color: '#ffffff',
        display: 'standalone', // 앱처럼 보이게 설정
        icons: [
            {
              src: 'og-image-512.png', // 실제 512x512 정사각형 파일
              sizes: '192x192',    // 브라우저가 알아서 리사이징해서 씁니다
              type: 'image/png'
            },
            {
              src: 'og-image-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'og-image-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable' // 안드로이드에서 아이콘이 꽉 차게 보임
            }
          ]
      }
    })
  ]
})