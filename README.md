# Vazifalar — Offline-First PWA To-Do Ilovasi

Vue 3 (Composition API, `<script setup>`), Pinia, Vue Router va Vite yordamida yaratilgan zamonaviy, tezkor va to'liq oflayn ishlovchi vazifalar boshqaruvi web ilovasi.

Barcha matnlar va interfeys **o'zbek tilida**. Ma'lumotlar foydalanuvchining o'z qurilmasida **IndexedDB** orqali saqlanadi — backend, server va loginsiz.

---

## 🌟 Asosiy imkoniyatlar

- **Offline-First PWA:** Internetga ulanmasdan ishlaydi, kompyuter (macOS / Windows), telefon (Android / iOS) va planshetlarga to'liq mustaqil ilova sifatida o'rnatiladi.
- **IndexedDB Saqlash Qatlami:** Ma'lumotlar xavfsiz va tezkor mahalliy bazada saqlanadi (`services/db.js` adapteri orqali).
- **Muddat turlari (Davrlar):** Kunlik, Haftalik (dushanbadan boshlanuvchi), Oylik va Yillik rejalar.
- **Muddati o'tgan vazifalar nazorati:** O'tgan davrlarda bajarilmay qolgan vazifalar joriy davr tepasida alohida ogohlantirish bloki bilan chiqadi va bitta tugma orqali "Joriy davrga ko'chirish" imkoniyati mavjud.
- **Loyihalar (Bo'limlar):** Loyiha nomi, maxsus ranglar va emojilar. Loyihani o'chirishda vazifalarni "Kiruvchi"ga ko'chirish yoki birga o'chirish tanlovi.
- **Statistika va Progress Bar:** Har bir davr va tanlangan loyiha bo'yicha jami, bajarilgan, qolgan vazifalar va bajarilish foizi.
- **Ichki vazifalar (Subtasks / Checklist):** Katta vazifalarni bosqichma-bosqich qadamlarga bo'lish, har bir qadamni belgilash va kartochka ustida mini-progress ko'rinishi.
- **Takrorlanuvchi vazifalar (Recurring Tasks):** Har kuni, ish kunlari (Dush-Juma), har hafta yoki har oy avtomatik qayta tiklanuvchi vazifalar. Bajarilganda keyingi sana uchun yangi nusxasi o'zi ochiladi.
- **Aniq vaqt va Bildirishnomalar:** Vazifaga soat/daqiqa belgilash va vaqti yetganda brauzer/tizim eslatma bildirishnomasi (Web Notification) chiqarish.
- **Pomodoro Taymer va Fokus rejimi:** Tanlangan vazifa uchun 25 daqiqalik fokus taymeri, 5/15 daqiqalik tanaffuslar, aylanuvchi progress va taymer yakunida mayin gong tovushi.
- **Streak & Odatlar statistikasi (🔥):** Kunlik rejalarni bajarish ketma-ketligi (Streak), haftalik 7 kunlik faollik ustunli grafigi va jami bajarilgan ishlar tahlili.
- **Yoqimli mikro-animatsiya va Ovoz:** Vazifa bajarilganda Web Audio API yordamida chalinuvchi mayin akkord (chime) va rang-barang bayramona konfetti uchqunlari.
- **Savatcha (Trash / Recycle Bin):** O'chirilgan vazifalar vaqtinchalik savatchaga tushadi, ularni istalgan payt qayta tiklash yoki butunlay tozalash mumkin.
- **Drag & Drop Tartiblash:** Vazifalarni sensorli ekranda va sichqoncha orqali sudrab tartiblash (`vue-draggable-plus` yordamida).
- **Qidiruv va Filtr:** Barchasi / Bajarilmagan / Bajarilgan holatlari, saralash tartibi va tezkor sarlavha qidiruvi.
- **macOS Widget ko'rinishi (`/widget`):** 360×480 px ixcham oynaga moslashtirilgan, faqat bugungi kunlik vazifalar va tezkor qo'shish maydoni.
- **Zaxira (Backup JSON):** Barcha loyihalar va vazifalarni JSON fayl sifatida yuklab olish (Eksport) hamda boshqa qurilmalarda "Qo'shib birlashtirish" yoki "To'liq almashtirish" usullarida tiklash (Import).
- **Doimiy saqlash (`navigator.storage.persist`):** Brauzer disk to'lganda ma'lumotlarni o'chirib yubormasligi uchun doimiy himoya so'rovi.
- **Yorug' va Qorong'i dizayn:** Tizim sozlamasiga avtomatik moslashuvchi (prefers-color-scheme) hamda qo'lda tanlanuvchi Dark/Light mode.

---

## 🚀 Loyihani ishga tushirish

### 1. Bog'liqliklarni o'rnatish
```bash
npm install
```

### 2. Dasturchi rejimida ishga tushirish (Dev server)
```bash
npm run dev
```
Brauzeringizda oching: [http://localhost:5173/](http://localhost:5173/)

### 3. Production uchun yig'ish (Build)
```bash
npm run build
```
Yig'ilgan fayllar `dist/` papkasiga tushadi (Service Worker, Manifest va barcha keshlanadigan aktivlar).

### 4. Build natijasini ko'rish (Preview)
```bash
npm run preview
```

---

## 🌐 Deploy qilish (Internetga joylashtirish)

> **MUHIM:** Progressive Web App (PWA) va Service Worker ishlashi uchun **HTTPS** protokoli majburiy (faqat `localhost` bundan mustasno).

### 1. Netlify (Tavsiya etiladi)
Loyiha ildizida `netlify.toml` fayli allaqachon sozlangan (SPA history mode va Service Worker keshlash sarlavhalari bilan).
- Netlify hisobingizga kiring -> **Add new site** -> **Import an existing project**.
- GitHub reponi ulang yoki `dist` papkasini bevosita Netlify UI'ga sudrab tashlang (Drag & Drop deploy).
- Build command: `npm run build`
- Publish directory: `dist`

### 2. Vercel
- `vercel` CLI buyrug'ini ishga tushiring yoki vercel.com orqali GitHub reponi ulang.
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 📱 Har bir qurilmada o'rnatish (PWA Yo'riqnomasi)

### 🍏 iPhone va iPad (iOS Safari)
1. Safari brauzerida sayt manzilini oching.
2. Pastki paneldagi **"Ulashish" (Share)** tugmasini bosing (yuqoriga yo'nalgan strelka belgisi).
3. Ro'yxatdan **"Asosiy ekranga" (Add to Home Screen)** bandini tanlang.
4. Yuqori o'ng burchakdagi **"Qo'shish" (Add)** tugmasini bosing.
> *Eslatma (iOS):* iOS tizimida "Asosiy ekranga qo'shilgan" ilova Safari brauzeridagi sahifadan mustaqil IndexedDB xotirasiga ega bo'lishi mumkin. Saytdan ilovaga o'tishda Sozlamalar bo'limidan JSON zaxira eksport qilib, ilova ichida import qiling.

### 🤖 Android (Chrome / Edge / Samsung Internet)
1. Saytga kiring.
2. Ekranning pastida avtomatik **"Ilovani o'rnatish"** tugmasi yoki taklif paydo bo'ladi.
3. Agar chiqmasa, yuqori o'ng burchakdagi menyuni (**⋮**) bosing va **"Ilovani o'rnatish" (Install app)** yoki **"Bosh ekranga qo'shish"** bandini tanlang.

### 💻 macOS (Apple Mac)
**Variant A: Safari (macOS Sonoma 14+)**
1. Safari'da saytni oching (masalan, `/widget` sahifasini).
2. Yuqori menyudan **Fayl (File) -> Dock'ka qo'shish... (Add to Dock...)** ni bosing.
3. Ilova Dock'da paydo bo'ladi va Safari brauzeridan mustaqil, chiroyli ixcham oyna ko'rinishida ochiladi.

**Variant B: Google Chrome / Microsoft Edge**
1. Manzil panelining (URL bar) o'ng tomonidagi **O'rnatish (Install)** belgisini bosing.
2. "O'rnatish"ni tasdiqlang. Ilova Launchpad va Dock'da paydo bo'ladi.

### 🪟 Windows (Chrome / Edge)
1. Manzil qatoridagi **Ilovani o'rnatish** belgisini bosing yoki brauzer menyusidan **Ilovalar (Apps) -> Ushbu saytni ilova sifatida o'rnatish** ni tanlang.
2. Ilova "Pusk" menyusida va Ish stolida paydo bo'ladi.

---

## 🔒 Xavfsizlik va Ma'lumotlar integratsiyasi

- **Server yo'q:** Sizning barcha shaxsiy rejalaringiz faqat o'z kompyuteringiz yoki telefoningizda qoladi.
- **Zaxira nusxa:** Ma'lumotlarni yo'qotib qo'ymaslik uchun har 30 kunda ilova avtomatik eslatma beradi. Zaxira faylini Google Drive, Telegram yoki boshqa joyda saqlashingiz mumkin.
