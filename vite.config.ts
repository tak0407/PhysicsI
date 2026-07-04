import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // GitHub Pages는 https://<user>.github.io/PhysicsI/ 하위에서 서빙된다
  base: command === 'build' ? '/PhysicsI/' : '/',
  plugins: [react()],
}))
