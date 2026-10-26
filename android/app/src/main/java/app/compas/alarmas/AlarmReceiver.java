package app.compas.alarmas;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Recibe el aviso del sistema a la hora de la alarma y pone en marcha el sonido. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Programador.ACCION_SONAR.equals(intent.getAction())) return;
        long ts = intent.getLongExtra("ts", 0L);
        boolean prueba = intent.getBooleanExtra("prueba", false);
        String nombre = intent.getStringExtra("nombre");
        String hora = intent.getStringExtra("hora");
        String tono = intent.getStringExtra("tono");
        if (nombre == null) nombre = "Alarma";
        if (hora == null) hora = "";
        if (tono == null) tono = "Sirena";

        if (!prueba) {
            // Varias alarmas a la misma hora suenan juntas, con todos sus nombres.
            StringBuilder nombres = new StringBuilder();
            for (Evento e : Almacen.leer(context)) {
                if (e.ts != ts) continue;
                if (nombres.indexOf(e.nombre) >= 0) continue;
                if (nombres.length() > 0) nombres.append(" · ");
                nombres.append(e.nombre);
            }
            if (nombres.length() > 0) nombre = nombres.toString();
            Almacen.marcarUltimo(context, Math.max(ts, Almacen.ultimo(context)));
        }

        Intent servicio = new Intent(context, AlarmService.class);
        servicio.setAction(AlarmService.ACCION_SONAR);
        servicio.putExtra("nombre", nombre);
        servicio.putExtra("hora", hora);
        servicio.putExtra("tono", tono);
        try {
            context.startForegroundService(servicio);
        } catch (RuntimeException ex) {
            avisoDeRespaldo(context, nombre, hora);
        }

        if (!prueba) {
            Programador.programarSiguiente(context);
        }
    }

    /** Si Android no deja arrancar el servicio, al menos una notificación con sonido de alarma. */
    private void avisoDeRespaldo(Context context, String nombre, String hora) {
        AlarmService.crearCanalRespaldo(context);
        Notification n = AlarmService.construirNotificacion(
                context, nombre, hora, AlarmService.CANAL_RESPALDO);
        NotificationManager nm =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && Build.VERSION.SDK_INT >= 26) {
            nm.notify(AlarmService.ID_RESPALDO, n);
        }
    }
}
