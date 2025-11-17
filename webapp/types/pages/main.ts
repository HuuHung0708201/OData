export interface LeaveRequestItem {
  CreatedAt: Date;
  Reason: string;
  RequestId: string;
  CreatedBy: string;
  EmployeeId: string;
  LeaveType: string;
  StartDate: string;
  EndDate: string;
  Status: string;
  TimeSlot: string;
}

export interface LeaveRequestForm {
  LeaveType: string;
  StartDate: string;
  EndDate: string;
  Reason: string;
  TimeSlot: string;
  TimeSlotIndex: number;
}

export interface FieldValueHelpItem {
  FieldKey: string;
  FieldValue: string;
  FieldName: string;
}