# Cambridge Science Mind Map App

App ôn tập Science Cambridge bằng sơ đồ tư duy có hình ảnh, keyword card, flashcard quiz, đăng nhập và đồng bộ dữ liệu bằng Supabase.

## 1. Tạo Supabase project riêng

- Vào Supabase, tạo project mới, ví dụ: `science-mindmap`.
- Vào SQL Editor, chạy file `supabase-schema.sql`.
- Vào Storage, tạo bucket tên `science-images`.
- Bật Public cho bucket `science-images` để ảnh hiện dễ nhất.

## 2. Lấy API key

Vào Supabase > Project Settings > API:

- Project URL
- anon public key

## 3. Tạo file `.env`

Copy `.env.example` thành `.env`, rồi điền:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

## 4. Chạy thử trên máy

```bash
npm install
npm run dev
```

## 5. Đưa lên GitHub và Vercel

- Tạo GitHub repo riêng: `science-mindmap-app`
- Upload toàn bộ code lên GitHub.
- Vào Vercel > New Project > chọn repo này.
- Trong Vercel > Settings > Environment Variables, thêm:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Deploy.

## 6. Cách dùng

- Đăng ký / đăng nhập.
- Tạo folder: Plants, Animals, Materials...
- Tạo mind map trong folder.
- Bấm keyword để sửa nội dung, thêm hình ảnh, giải thích tiếng Anh, nghĩa tiếng Việt, ví dụ.
- Bấm Quiz me để ôn theo flashcard.
