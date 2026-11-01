package app.compas.alarmas;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

/**
 * Aviso de la próxima alarma: desde 12 horas antes aparece una notificación silenciosa
 * (visible en el bloqueo) con la hora a la que sonará. Antes de ese momento se programa
 * un despertador discreto que lo publica.
 */
final class ProximaAlarma {
    static final String ACCION_AVISO = "app.compas.alarmas.AVISO";
    static final String CANAL = "compas_proxima";
    static final int ID_NOTIFICACION = 4203;
    private static final int CODIGO_AVISO = 3;

    private ProximaAlarma() {}

    /** Recalcula el aviso según la próxima alarma. Nunca debe romper la programación. */
    static void actualizar(Context c) {
        try {
            long ahora = System.currentTimeMillis();
            Evento siguiente = Programador.buscarSiguiente(c, ahora);
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.cancel(pendienteAviso(c));
            if (siguiente == null || siguiente.ts <= ahora) {
                quitar(c);
            } else if (ReglasAviso.debeMostrar(siguiente.ts, ahora)) {
                publicar(c, siguiente, ahora);
            } else {
                quitar(c);
                if (am != null) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,
                            ReglasAviso.momentoAviso(siguiente.ts), pendienteAviso(c));
                }
            }
        } catch (RuntimeException ignorada) {
            // El aviso es un extra: si falla, las alarmas siguen funcionando.
        }
    }

    /** Quita el aviso y su despertador (por ejemplo al cancelar todas las alarmas). */
    static void cancelar(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.cancel(pendienteAviso(c));
            quitar(c);
        } catch (RuntimeException ignorada) {
            // Sin consecuencias.
        }
    }

    private static void publicar(Context c, Evento e, long ahora) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || !nm.areNotificationsEnabled()) return;
        NotificationChannel canal = new NotificationChannel(
                CANAL, "Próxima alarma", NotificationManager.IMPORTANCE_LOW);
        canal.setDescription("Hora de la próxima alarma, desde 12 horas antes");
        canal.setSound(null, null);
        canal.enableVibration(false);
        canal.setShowBadge(false);
        canal.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(canal);

        PendingIntent abrir = PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle("Próxima alarma: " + ReglasAviso.texto(e.hora, e.ts, ahora))
                .setContentText(e.nombre)
                .setCategory(Notification.CATEGORY_STATUS)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(true)
                .setWhen(e.ts)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setTimeoutAfter(e.ts - ahora + 60000L)
                .setContentIntent(abrir)
                .build();
        nm.notify(ID_NOTIFICACION, n);
    }

    private static void quitar(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(ID_NOTIFICACION);
    }

    private static PendingIntent pendienteAviso(Context c) {
        Intent i = new Intent(c, AvisoReceiver.class);
        i.setAction(ACCION_AVISO);
        return PendingIntent.getBroadcast(c, CODIGO_AVISO, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
