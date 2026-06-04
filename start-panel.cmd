@echo off
set NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
set NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
set NODE_ENV=development
cd /d D:\Jota\Desa\SIAGRD\apps\panel-web
node D:\Jota\Desa\SIAGRD\node_modules\.pnpm\next@14.2.0_@opentelemetry+api@1.9.1_react-dom@18.2.0_react@18.2.0__react@18.2.0\node_modules\next\dist\bin\next dev -p 3001
