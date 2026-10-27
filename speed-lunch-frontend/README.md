# SpeedLunchFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## แผนที่เส้นทางในเว็บ

หน้า `/route-plan` มีปุ่มดูแผนที่ของแต่ละใบงาน ส่วนหน้า `/rider` ดูเส้นทางทั้งหมดหรือเลือกนำทางไปทีละจุดได้ โดยไม่เปิด Google Maps

- ใช้ Leaflet แสดงแผนที่ OpenStreetMap และเรียก OSRM Route API เพื่อวาดเส้นทางตามถนนตามลำดับจุดส่งเดิม
- ปุ่มเริ่มนำทางขออนุญาตตำแหน่งจาก Browser แสดงตำแหน่งปัจจุบัน และคำนวณเส้นใหม่เมื่อเคลื่อนที่เกิน 40 เมตร โดยเว้นอย่างน้อย 15 วินาทีระหว่างการคำนวณ
- GPS ต้องใช้ HTTPS หรือ localhost และต้องเปิดหน้าจอเว็บไว้ การเปลี่ยนจุดส่งจะหยุด GPS ให้กดเริ่มนำทางอีกครั้ง
- มีคำแนะนำตามเส้นทางเป็นข้อความ ยังไม่มีเสียงนำทางหรือการยืนยันส่งอัตโนมัติ
- ใช้บริการสาธารณะ `https://router.project-osrm.org` แบบ driving ซึ่งเป็นโปรไฟล์รถยนต์ ไม่ใช่เส้นทางเฉพาะรถจักรยานยนต์ ไม่มีข้อมูลจราจรสด และบริการอาจไม่พร้อมใช้งาน หากคำนวณไม่ได้จะแสดงข้อผิดพลาดโดยไม่วาดเส้นตรงแทน
- พิกัดร้าน จุดส่ง และตำแหน่ง GPS ขณะนำทางจะส่งไปยัง OSRM เพื่อคำนวณเส้นทาง ส่วนแผนที่พื้นหลังโหลดจาก OpenStreetMap
- ตัวเลขระยะทางและเวลาที่แสดงบนแผนที่เป็นผลจาก OSRM ส่วนค่าส่ง กำไร และเวลาถึงในใบงานยังเป็นข้อมูลแผนจาก Backend
