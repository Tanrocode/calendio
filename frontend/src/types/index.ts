export type Appointment = {
  customer_name: string;
  service: string;
  start_time: string;
  end_time: string;
};

export type Metrics = {
  total_conversations: number;
  total_appointments_created: number;
};
