export function getEventCountdown(date: Date | string) {
  const eventTime = new Date(date).getTime();
  const diffMs = eventTime - Date.now();

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      hasStarted: true,
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days,
    hours,
    minutes,
    hasStarted: false,
  };
}
