const STATUS_TEXT: { [status: string]: string } = {
  pending: 'รอส่ง',
  delivered: 'ส่งแล้ว',
  cancelled: 'ยกเลิก',
  active: 'ใช้งานอยู่',
  completed: 'ส่งครบแล้ว',
  assigned: 'รอออกส่ง',
  in_progress: 'กำลังส่ง',
};

export function statusText(status: string) {
  return STATUS_TEXT[status] ?? status;
}
