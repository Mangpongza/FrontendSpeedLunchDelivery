# Frontend งานคนที่ 3 และคนที่ 4

## หน้าจอ

- `/routes`: RouteDashboard ของคนที่ 3
- `/rider`: RiderEntry ของคนที่ 4
- `/rider/jobs/:jobCode`: RiderJob ของคนที่ 4
- RouteMap เป็น component แผนที่ที่แยกไว้ใน components

## ทดลอง

รัน `npm start` แล้วเปิด http://localhost:4200/routes
กดคำนวณเส้นทาง → ยืนยันและออกใบงาน → เปิดใบงานจากการ์ดไรเดอร์
กดส่งสำเร็จเพื่ออัปเดตสถานะ บันทึก localStorage เฉพาะ browser เดียวกัน
ใช้โทรและ Google Maps ได้ แต่ชื่อ ที่อยู่ เบอร์โทร และพิกัดเป็นข้อมูลตัวอย่าง

## ตัวแปรเชื่อมงาน

`model/delivery.ts` กำหนด Customer, Order, TripStop, Trip, DeliverySummary, RoutePlan
`service/app-data.ts` เป็นจุดรวมข้อมูลและคำสั่ง:

- `orders`: รับรายการออเดอร์ของคนที่ 2 ซึ่งมี Customer ของคนที่ 1
- `plan`: ผลคำนวณแผนส่งของคนที่ 3
- `jobs`: ใบงานที่ยืนยันให้หน้าคนที่ 4 ใช้
- `apiEndpoints`: จุด API ที่เตรียมไว้ ยังไม่ได้เรียก network
- `calculatePlan()`: เปลี่ยนเป็น POST /api/routes/optimize
- `confirmPlan()`: เปลี่ยนเป็น POST /api/routes/confirm
- `findJob()`: เปลี่ยนเป็น GET /api/rider/jobs/:jobCode (ต้องรองรับ async/loading/error)
- `markDelivered()`: เปลี่ยนเป็น PATCH /api/rider/orders/:id/status

ใช้ camelCase ใน model หน้าบ้าน ถ้า Backend ใช้ snake_case ให้แปลงใน service
ตั้งค่า provideHttpClient ใน app.config.ts เมื่อเชื่อม Backend จริง
พิกัดร้านตัวอย่างและกติกาอยู่ใน SHOP และ DELIVERY_RULES

## ข้อจำกัดโหมดทดลอง

การจัดกลุ่มตามมุมและระยะ Haversine ใช้ทดสอบ UI ไม่รับประกันเส้นทางสั้นที่สุด
เส้นแผนที่เชื่อมหมุดด้วยเส้นตรง ไม่ใช่ถนน ไม่รวมขากลับ
เวลา = ระยะ / 30 กม./ชม. + จุดละ 3 นาที; ค่าแรง = 15 + 2 × กล่อง × ระยะ
กดเสนอแผนใหม่จะเปลี่ยนการจัดกลุ่มตัวอย่าง ห้ามแก้ออเดอร์ที่ยืนยันแล้วโดยไม่จัดการใบงานเดิม
ข้อมูล localStorage ไม่แชร์ข้ามเครื่อง ต้องใช้ API/DB เพื่อใช้งานจริง
ไม่มีหน้าคนที่ 1 และ 2 และไม่มีการยืนยันตัวตนในงานนี้
Leaflet ใช้ OpenStreetMap tiles ซึ่งต้องเชื่อมอินเทอร์เน็ต
โปรเจกต์มี SSR เดิมอยู่ แผนที่และ localStorage ทำงานเฉพาะ browser
route ใบงานแบบ dynamic ตั้ง RenderMode.Client เพื่อไม่ต้อง prerender ทุกเลขใบงาน

กด “เริ่มข้อมูลตัวอย่างใหม่” ด้านล่างหน้าจัดเส้นทางเพื่อล้างใบงานจำลองและทดสอบรอบใหม่

## Tailwind และไฟล์ Component

ทุกหน้าของคนที่ 3 และคนที่ 4 รวมถึงแถบเมนู ใช้ Tailwind utility classes ใน HTML
RouteMap แยกเป็น route-map.ts, route-map.html และ route-map.css
ไฟล์ CSS ของ component เตรียมไว้สำหรับสไตล์เฉพาะ; ปัจจุบันใช้ Tailwind เป็นหลัก
styles.css มี Tailwind, daisyUI, Leaflet และ base styles ที่ใช้ @apply เท่านั้น
สีเส้นทางจาก trip.color ยังส่งให้ Leaflet ผ่าน TypeScript เพราะเป็นข้อมูล dynamic

## โครงสร้างตามบทเรียน

- pages/route-dashboard: หน้าคนที่ 3
- pages/rider-entry และ pages/rider-job: หน้าคนที่ 4
- components/route-map: ส่วนแผนที่ที่หน้าเรียกด้วย selector
- model/delivery.ts: interfaces ของ Customer, Order, Trip และผลสรุป
- service/app-data.ts: AppData สำหรับแชร์ orders, plan, jobs และข้อมูลจำลอง
- app.routes.ts: import หน้าจอแล้วกำหนด component ตามบทเรียน Angular Router
- app.config.ts: withComponentInputBinding() เพื่อรับ jobCode ด้วย input.required()

core, features และ shared เป็นโครงสร้างเดิมที่เพิ่มเอง ซึ่งย้ายออกแล้ว
ใช้ signal กับ @for/@if ตามบทเรียน; computed เป็นค่าที่คำนวณจาก signal
สำหรับ Leaflet ยังต้องเริ่มแผนที่หลัง DOM พร้อมและเฉพาะ browser เพราะโปรเจกต์เปิด SSR อยู่
