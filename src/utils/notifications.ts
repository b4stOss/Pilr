import { notifications } from '@mantine/notifications';

/**
 * Show an error notification to the user
 */
export function showErrorNotification(message: string, title = 'Error') {
  notifications.show({
    title,
    message,
    color: 'red',
    autoClose: 5000,
  });
}

/**
 * Show a success notification to the user
 */
export function showSuccessNotification(message: string, title = 'Success') {
  notifications.show({
    title,
    message,
    color: 'green',
    autoClose: 3000,
  });
}
