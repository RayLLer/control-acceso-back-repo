import fcmService from '../src/services/fcm';

function normalizeToMidnight(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function parseDateString(dateString: string) {
  const isoMatch = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) {
    return new Date(dateString);
  }

  const ddmmyyyyMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(dateString);
}

function parseUltimoPeriodoPago(periodoPago?: string) {
  if (!periodoPago) return null;

  const partes = periodoPago.split('::').map((value) => value.trim());
  if (partes.length < 2) return null;

  const fechaFin = parseDateString(partes[1]);
  if (Number.isNaN(fechaFin.getTime())) return null;

  return normalizeToMidnight(fechaFin);
}

function getDaysDifference(startDate: Date, endDate: Date) {
  const start = normalizeToMidnight(startDate);
  const end = normalizeToMidnight(endDate);
  const msPorDia = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPorDia);
}

export default {
  paymentReminder: {
    task: async ({ strapi }: { strapi: any }) => {
      console.log('[cron] Ejecutando verificación diaria de pagos a las 14:00');

      try {
        const usuarios = await strapi.db.query('plugin::users-permissions.user').findMany({
          select: ['id', 'fcm', 'ultimoPeriodoPago'],
          where: {
            fcm: { $notNull: true },
            ultimoPeriodoPago: { $notNull: true },
          },
        });

        const hoy = new Date();

        for (const usuario of usuarios) {
          const token = usuario.fcm?.trim();
          const fechaFin = parseUltimoPeriodoPago(usuario.ultimoPeriodoPago);
          if (!token || !fechaFin) {
            if (!fechaFin) {
              console.log(`[cron] Usuario ${usuario.id} tiene un "ultimoPeriodoPago" inválido: ${usuario.ultimoPeriodoPago}`);
            }
            continue;
          }

          const diasRestantes = getDaysDifference(hoy, fechaFin);
          console.log(`[cron] Usuario ${usuario.id} - Días restantes para vencimiento: ${diasRestantes}`);

          if (diasRestantes < 0) {
            const title = 'Pago vencido';
            const body = `Tu pago venció el ${fechaFin.toLocaleDateString()}. Actualiza tu pago cuanto antes.`;
            try {
              await fcmService.sendToTokens([token], title, body, {
                motivo: 'pago_vencido',
                userId: String(usuario.id),
              });
              console.log(`[cron] Pago vencido notificado a usuario ${usuario.id}`);
            } catch (error) {
              console.log(`[cron] Error enviando notificación de pago vencido a usuario ${usuario.id}`, error);
            }
          } else if (diasRestantes === 2) {
            const title = 'Pago vence en 2 días';
            const body = `Tu pago vence el ${fechaFin.toLocaleDateString()}. Por favor realiza el pago para mantener el acceso.`;
            try {
              await fcmService.sendToTokens([token], title, body, {
                motivo: 'pago_proximo',
                userId: String(usuario.id),
              });
              console.log(`[cron] Recordatorio de pago enviado a usuario ${usuario.id}`);
            } catch (error) {
              console.log(`[cron] Error enviando notificación de pago próximo a usuario ${usuario.id}`, error);
            }
          }
        }
      } catch (error) {
        console.log('[cron] Error ejecutando la verificación diaria de pagos', error);
      }

      console.log('[cron] Verificación diaria de pagos completada');
    },
    options: {
      rule: '0 35 20 * * *',
    },
  },
};
