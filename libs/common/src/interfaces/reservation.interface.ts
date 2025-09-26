import { ReservationStatus } from 'src/enums/reservation-status.enum';

export interface CreateReservationRequest {
  startTime: string;
  email: string;
  phone: string;
  pushNotificationKey: string;
  receiveEmail: boolean;
  receiveSmsNotification: boolean;
  receivePushNotification: boolean;
}

export interface GetSingleReservationResponse {
  id: string;
  startTime: string;
  email: string;
  phone: string;
  pushNotificationKey: string;
  endTime: string;
  status: ReservationStatus;
  createdTime: string;
  updatedTime: string;
  receiveEmail: boolean;
  receiveSmsNotification: boolean;
  receivePushNotification: boolean;
}

export interface CreateReservationResponse {
  status: 'success' | 'error';
  record?: GetSingleReservationResponse;
  message?: string;
}

export interface GetReservationsResponse {
  records: GetSingleReservationResponse[];
}
